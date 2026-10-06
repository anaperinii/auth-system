# Sistema de Cadastro de Usuários e Autenticação

Este repositório contém uma API REST de cadastro e autenticação de usuários, como projeto integrante à disciplina de Desenvolvimento de API Back-end (Ciclo II), construída sobre Node.js, Express e TypeScript, com proteção de senhas por bcrypt, manutenção de sessão por JWT e persistência em PostgreSQL através do Prisma ORM. Acompanham a aplicação uma documentação viva da interface HTTP, gerada a partir dos próprios schemas de validação e um front-end de demonstração escrito em React.

O presente documento descreve a solução de forma expositiva: além de relatar *o que* foi construído, procura justificar *por que* cada decisão foi tomada, quais alternativas foram consideradas e quais custos foram assumidos. As limitações conhecidas são enunciadas explicitamente, por entender-se que a omissão delas comprometeria o valor documental do texto.

---

## Sumário

1. [Execução do sistema](#1-execução-do-sistema)
2. [Tecnologias e frameworks empregados](#2-tecnologias-e-frameworks-empregados)
3. [Arquitetura da aplicação](#3-arquitetura-da-aplicação)
4. [Armazenamento dos dados](#4-armazenamento-dos-dados)
5. [O processo de cadastro](#5-o-processo-de-cadastro)
6. [O processo de autenticação](#6-o-processo-de-autenticação)
7. [A proteção da senha](#7-a-proteção-da-senha)
8. [O mecanismo de manutenção da sessão](#8-o-mecanismo-de-manutenção-da-sessão)
9. [Interface HTTP da aplicação](#9-interface-http-da-aplicação)

---

## 1. Execução do sistema

### Pré-requisitos

- **Node.js 18 ou superior.** O desenvolvimento e os testes foram conduzidos sobre o Node 22.
- **PostgreSQL 12 ou superior**, em execução e acessível. O desenvolvimento e os testes foram conduzidos sobre o PostgreSQL 17.

### Procedimento de instalação

```bash
# 1. Instalar as dependências
npm install

# 2. Criar o arquivo de configuração
copy .env.example .env        # Windows
# cp .env.example .env        # Linux / macOS

# 3. Editar o .env e preencher a DATABASE_URL
#    postgresql://usuario:senha@localhost:5432/sistema_login?schema=public

# 4. Aplicar as migrações (cria o banco se não existir, a tabela,
#    a extensão citext, as constraints e a trigger)
npm run db:migrate

# 5. Compilar o front-end (React + Vite)
npm run web:build

# 6. Subir o servidor
npm run dev
```

Duas observações são pertinentes a esse procedimento.

A primeira diz respeito à quinta etapa. Caso o endereço `http://localhost:3000` seja acessado sem que a compilação do front-end tenha ocorrido, o servidor responde com uma mensagem explicativa em vez de um erro silencioso, uma vez que o diretório `web/dist/` constitui artefato de build e, por essa razão, não é versionado. Para o desenvolvimento da interface com recarregamento automático, recomenda-se executar `npm run web:dev` em um segundo terminal: o Vite passa a atender em `http://localhost:5173` e repassa as chamadas dirigidas a `/api` para o Express na porta 3000.

A segunda diz respeito à terceira etapa. A senha contida na `DATABASE_URL` integra uma URL e, consequentemente, os caracteres `@`, `:`, `/`, `?`, `#` e `%` exigem *percent-encoding*. Uma senha que contenha `@` rompe o *parsing* da URL e produz um erro de conexão de diagnóstico difícil, pois em momento algum menciona a senha como causa. A codificação pode ser obtida por:

```bash
node -e "console.log(encodeURIComponent('SENHA_AQUI'))"
```

Concluída a instalação, os seguintes endereços tornam-se disponíveis:

| Endereço | Descrição |
|---|---|
| `http://localhost:3000` | Interface de demonstração: cadastro, login e área restrita |
| **`http://localhost:3000/api/docs`** | **Documentação viva da API (Swagger UI), com execução das chamadas no próprio navegador** |
| `http://localhost:3000/api/reference` | A mesma documentação na interface Scalar, de apresentação mais elaborada, porém dependente de conexão com a internet |
| `http://localhost:3000/api/openapi.json` | O documento OpenAPI em sua forma bruta, importável em Postman ou Insomnia |

Alternativamente, o arquivo `requests.http`, em conjunto com a extensão *REST Client* do VS Code, permite exercitar a API diretamente a partir do editor.


### Geração de um `JWT_SECRET` adequado

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Relação dos comandos disponíveis

| Comando | Finalidade |
|---|---|
| `npm run dev` | Executa a API em desenvolvimento, com reinício automático (`tsx watch`) |
| **`npm run web:dev`** | **Executa a interface com recarregamento automático (Vite na porta 5173, com proxy para a API)** |
| `npm run web:build` | Compila o front-end React para `web/dist/` |
| `npm run build` | Realiza o build completo: cliente Prisma, front-end e servidor |
| `npm start` | Executa a versão compilada |
| `npm run typecheck` | Verifica os tipos de **ambos** os alvos de compilação, servidor e navegador |
| `npm run db:migrate` | Aplica as migrações em desenvolvimento (`prisma migrate dev`) |
| `npm run db:deploy` | Aplica as migrações em produção, sem gerar novas (`prisma migrate deploy`) |
| `npm run db:generate` | Regenera o cliente Prisma a partir do `schema.prisma` |
| **`npm run db:studio`** | **Abre o Prisma Studio, interface visual para navegação e edição do banco** |
| `npm run db:sql` | Imprime o SQL que o Prisma gera para as consultas da aplicação |

A existência de dois comandos distintos para migração é deliberada. Em desenvolvimento, `migrate dev` compara o `schema.prisma` com o estado do banco e cria uma migração sempre que detecta divergência. Em um hipotético cenário de produção, tal comportamento seria temerário; por isso `migrate deploy` limita-se a aplicar as migrações já versionadas no repositório, sem gerar nenhuma.

---

## 2. Tecnologias e frameworks empregados

| Camada | Escolha | Justificativa |
|---|---|---|
| Linguagem | **TypeScript 5.8** | A tipagem estática antecipa para o tempo de compilação erros que, de outro modo, só se manifestariam em execução. A diretiva `strict: true` obriga ao tratamento de valores possivelmente `undefined`, o que elimina uma classe inteira de falhas. |
| Runtime | **Node.js 22** | Ambiente de execução de JavaScript no servidor. |
| Framework HTTP | **Express 5** | Minimalista e organizado em torno de *middlewares*. A versão 5 encaminha automaticamente ao tratador de erros as rejeições originadas em handlers `async`, o que na versão 4 exigia `try/catch` em cada rota ou um *wrapper* dedicado. É essa característica que permite aos controllers deste projeto prescindirem inteiramente de `try/catch`. |
| Banco de dados | **PostgreSQL 17** | Banco relacional de grau de produção: controle de concorrência por MVCC, tipagem estrita, suporte a `TIMESTAMPTZ` e repertório amplo de constraints. |
| Acesso a dados | **Prisma ORM 7** | O cliente é **gerado a partir do schema**, de modo que os tipos do banco e os tipos do código não podem divergir. Fornece, adicionalmente, migrações versionadas, recurso ausente na abordagem de SQL escrito à mão. Opera sobre o driver `pg` por meio de um *driver adapter*. |
| Hash de senha | **bcrypt (implementação nativa)** | Implementada em C++. Além do desempenho superior, executa na *thread pool* do libuv, de modo que o cálculo de aproximadamente 250 ms **não bloqueia o event loop** e o servidor permanece atendendo outras requisições durante o processamento. |
| Token | **jsonwebtoken** | Geração e verificação de JWT assinado com HS256. |
| Validação | **Zod** | Valida a entrada e, simultaneamente, *infere* o tipo TypeScript correspondente, constituindo fonte única de verdade para validação e tipagem. |
| Configuração | **dotenv** | Carrega variáveis de ambiente a partir do arquivo `.env`. |
| Front-end | **React 19 + Vite** | A interface mantém estado efetivo: aba ativa, indicação de envio em curso, erros por campo e sessão. Em JavaScript puro, tal gerenciamento recairia sobre `classList.toggle`, `setTimeout` e manipulação manual de reflow; em React, o estado é declarado e a tela decorre dele. |
| Documentação | **zod-to-openapi + Swagger UI + Scalar** | Gera o documento OpenAPI 3.1 **a partir dos mesmos schemas Zod que validam as requisições**. Inexistindo YAML paralelo, a documentação não dispõe de meio para divergir do código. |

### Considerações sobre a adoção do Prisma

Em primeiro lugar, o projeto incorpora o comando `npm run db:sql`, que imprime a consulta exata correspondente a cada operação. A título de ilustração, o `findUnique` utilizado no login produz:

```sql
SELECT "public"."users"."id", "public"."users"."name", "public"."users"."email",
       "public"."users"."password_hash", "public"."users"."created_at", "public"."users"."updated_at"
FROM "public"."users"
WHERE ("public"."users"."email" = $1 AND 1=1)
LIMIT $2 OFFSET $3
-- params: ["helena.marino@exemplo.com","1","0"]
```

Em segundo lugar, o ORM resolve um problema que a escrita manual de SQL deixava em aberto, o versionamento das migrações. O DDL idempotente adotado na versão anterior era suficiente para uma única tabela, mas não constituía histórico, de modo que não havia como determinar quais alterações já haviam sido aplicadas em cada ambiente. O Prisma Migrate gera arquivos SQL numerados e versionados no repositório e registra, na tabela `_prisma_migrations`, as migrações efetivamente executadas.

Acrescente-se que o Prisma Migrate produz arquivos `.sql` convencionais, passíveis de edição antes da aplicação. Foi precisamente por esse mecanismo que as constraints `CHECK` e a trigger, construções que o `schema.prisma` não sabe expressar, foram incorporadas à migração. 

---

## 3. Arquitetura da aplicação

A organização do código segue uma arquitetura em camadas, na qual cada camada conhece exclusivamente aquela imediatamente inferior:

```
Requisição HTTP
      ↓
   Rotas          definem o caminho e a cadeia de middlewares
      ↓
 Middlewares      rate limit, validação (Zod), autenticação (JWT)
      ↓
 Controllers      leem a requisição e montam a resposta HTTP
      ↓
  Services        regras de negócio (não conhecem req/res)
      ↓
   Models         chamadas Prisma (repository)
      ↓
 Cliente Prisma → adapter `pg` → PostgreSQL
```

A distribuição dessas camadas pelo sistema de arquivos é a seguinte:

```
prisma/
├── schema.prisma                  Modelo de dados: gera o cliente e as migrações
└── migrations/
    └── 20261005162036_init/
        └── migration.sql          SQL versionado (gerado + trecho escrito à mão)
prisma.config.ts                   Onde o banco está (Prisma 7 tirou a URL do schema)
scripts/
└── show-sql.ts                    Imprime o SQL que o Prisma gera (npm run db:sql)
src/
├── server.ts                      Ponto de entrada: valida a conexão, sobe, trata shutdown
├── app.ts                         Monta o Express e registra os middlewares na ordem
├── config/
│   └── env.ts                     Lê e valida as variáveis de ambiente
├── database/
│   └── db.ts                      Cliente Prisma sobre o adapter `pg`
├── models/
│   └── user.model.ts              Repository: as chamadas Prisma da tabela users
├── schemas/
│   └── auth.schema.ts             Schemas Zod de cadastro e login
├── services/
│   └── auth.service.ts            Regras de cadastro, login e perfil
├── controllers/
│   ├── auth.controller.ts         Camada HTTP da autenticação
│   └── dashboard.controller.ts    Área restrita de exemplo
├── middlewares/
│   ├── validate.middleware.ts     Valida req.body contra um schema Zod
│   ├── auth.middleware.ts         Exige e valida o token JWT
│   ├── rateLimit.middleware.ts    Limita tentativas por IP
│   └── error.middleware.ts        Tratador central de erros + 404
├── routes/
│   ├── index.ts                   Agrega as rotas sob /api
│   └── auth.routes.ts             Rotas de /api/auth
├── docs/
│   ├── extendZod.ts               Adiciona `.openapi()` ao Zod (antes dos schemas)
│   ├── openapi.ts                 Gera o documento OpenAPI 3.1 a partir dos schemas
│   └── docs.routes.ts             Serve Swagger UI, Scalar e o openapi.json
├── errors/
│   └── AppError.ts                Erro de negócio com status HTTP
└── types/
    └── express.d.ts               Adiciona `req.user` ao tipo Request do Express

web/                               Front-end: React + TypeScript, empacotado pelo Vite
├── index.html
├── tsconfig.json                  TypeScript do NAVEGADOR (separado do servidor)
├── public/assets/                 Imagem de fundo, fontes e logo (servidos localmente)
└── src/
    ├── main.tsx                   Ponto de entrada do React
    ├── App.tsx                    Estado da tela: 'login' | 'register' | 'session'
    ├── api.ts                     Camada de acesso à API (o único lugar com `fetch`)
    ├── styles.css
    ├── hooks/useAnimatedText.ts   Anima a troca de texto do título
    ├── lib/format.ts              Saudação, sobrenome, formatação de data
    └── components/
        ├── Stage.tsx              Coluna da esquerda: marca + tipografia grande
        ├── Badge.tsx              Cadeado (aberto no acesso, fechado na área restrita)
        ├── Field.tsx              Campo com rótulo, erro e acessibilidade
        ├── AuthForms.tsx          Formulários de login e cadastro
        └── Dashboard.tsx          Área restrita
vite.config.mts                    Build do front-end + proxy /api em desenvolvimento
```

O critério que justifica tal separação é o de que cada camada passe a possuir uma única razão para mudar. O teste decisivo encontra-se no `auth.service.ts`: ele não importa nada do Express e desconhece, portanto, o que seja uma requisição HTTP. Recebe dados já validados e devolve dados ou lança um `AppError`. Disso decorre que a lógica de negócio pode ser testada sem que se suba um servidor e que a eventual substituição do Express por outro framework não obrigaria à reescrita das regras de negócio.

### Convenções de nomenclatura


| | Convenção | Exemplo |
|---|---|---|
| Variáveis, funções, tipos | `camelCase` / `PascalCase`, em inglês | `getLastName`, `isSubmitting`, `AuthFormProps` |
| Constantes de módulo | `SCREAMING_SNAKE_CASE` | `UUID_PATTERN`, `TOKEN_STORAGE_KEY` |
| Campos do JSON da API | `camelCase`, em inglês | `accessToken`, `memberSince`, `serverTime` |
| Colunas do banco | `snake_case`, conforme a convenção SQL | `password_hash`, `created_at` |
| Mensagens ao usuário | Português, com acentuação correta | `"E-mail ou senha inválidos."` |

A tradução entre o `snake_case` do banco e o `camelCase` do código ocorre em um único ponto: a diretiva `@map` do `schema.prisma`.

Observam-se ainda duas convenções acessórias: identificadores booleanos recebem prefixo que torna o tipo evidente na leitura (`isSubmitting`, `isLocked`, `isCancelled`), e funções que retornam valor são nomeadas a partir de um verbo (`getGreeting`, `formatDateTime`, `decodeJwtPayload`).

### A necessidade de dois alvos de compilação

O projeto compila para dois ambientes distintos e, por essa razão, mantém dois arquivos `tsconfig.json`:

| | `src/` | `web/` |
|---|---|---|
| Executa em | Node.js | Navegador |
| Ferramenta | `tsc` → `dist/` | Vite → `web/dist/` |
| Sistema de módulos | CommonJS | ESM |
| Bibliotecas de tipo | Node | DOM |

Trata-se da mesma linguagem em ambientes mutuamente incompatíveis: o servidor desconhece `document` e o navegador desconhece `process`. A separação das configurações é o que impede que um seja importado no outro por inadvertência.

### A relevância da ordem dos middlewares

Em `app.ts`, o Express executa os middlewares na ordem em que foram registrados:

```ts
app.set('trust proxy', 1);              // 1. req.ip real atrás de um proxy
app.use(cors());                        // 2. libera chamadas de outras origens
app.use(express.json({ limit: '10kb' })); // 3. converte o corpo JSON em req.body
app.use(express.static('public'));      // 4. serve o front-end
app.use('/api', routes);                // 5. as rotas da API
app.use(notFoundHandler);               // 6. nada casou → 404
app.use(errorHandler);                  // 7. POR ÚLTIMO: tratador de erros
```

O tratador de erros deve necessariamente ocupar a última posição, uma vez que o Express o identifica pela aridade da função: uma função de quatro parâmetros `(err, req, res, next)` é registrada como *error handler*, e não como middleware comum.

---

## 4. Armazenamento dos dados

A persistência ocorre em PostgreSQL, na tabela `users`. O modelo é declarado em `prisma/schema.prisma`:

```prisma
model User {
  id           String   @id @default(uuid(7)) @db.Uuid
  name         String
  email        String   @unique @db.Citext
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("users")
}
```

A partir dessa declaração, o Prisma gera dois artefatos, as migrações SQL versionadas e o cliente TypeScript tipado. O SQL efetivamente aplicado pela migração é o seguinte:

```sql
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- A partir daqui, SQL escrito à mão dentro do arquivo de migração:
ALTER TABLE "users"
  ADD CONSTRAINT "users_name_length"  CHECK (char_length("name") BETWEEN 3 AND 120),
  ADD CONSTRAINT "users_email_format" CHECK ("email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  ADD CONSTRAINT "users_email_length" CHECK (char_length("email") <= 255);

ALTER TABLE "users"
  ADD CONSTRAINT "users_password_is_bcrypt"
  CHECK ("password_hash" ~ '^\$2[aby]\$[0-9]{2}\$.{53}$');

-- + a função e a trigger que mantêm updated_at coerente em qualquer UPDATE
```

### O ORM não restringe o acesso aos recursos do PostgreSQL

Constraints `CHECK` e triggers não possuem representação no `schema.prisma`, dado que o Prisma não sabe expressá-las. Tal circunstância poderia constituir motivo para a rejeição do ORM, mas não constitui: o Prisma Migrate gera arquivos `.sql` convencionais, editáveis antes da aplicação.

Foi por esse caminho que as quatro constraints e a trigger foram introduzidas. Como o Prisma não rastreia tais objetos, eles tampouco aparecem como *drift* nas migrações subsequentes; o ORM simplesmente os ignora e os preserva.

### As decisões de modelagem que requerem justificativa

**A coluna denomina-se `password_hash`, e nunca `password`.** O nome torna explícito que ali não se admite senha em texto puro.

**A constraint `users_password_is_bcrypt`** verifica que o valor apresenta a forma exata de um hash bcrypt: prefixo `$2a$`, `$2b$` ou `$2y$`, dois dígitos de custo e 53 caracteres subsequentes. Em consequência, um `INSERT` contendo senha em texto puro é rejeitado pelo próprio banco. Isso converte o requisito "a senha não pode ser armazenada em texto puro" de promessa do código em garantia estrutural: caso um endpoint seja acrescentado meses depois e o hash seja omitido por descuido, a gravação é recusada.

**O tipo `CITEXT` para o e-mail.** Um `UNIQUE` sobre `TEXT` admitiria `ANA@x.com` e `ana@x.com` como dois cadastros distintos, embora correspondam à mesma caixa postal. O `citext` é um tipo textual cuja comparação ignora a caixa, de modo que a diretiva `@unique` resolve a questão no próprio banco.

**Adoção de UUID v7 em lugar de identificador inteiro sequencial.** Um inteiro sequencial não é identificador opaco, ele revela informação e é previsível. Duas consequências ilustram o ponto. A primeira é que `/users/1` denuncia qual foi o primeiro cadastro, ao passo que a diferença entre dois identificadores revela quantas contas existem entre eles. A segunda é que, se qualquer endpoint deixar de verificar permissão, a simples substituição de `/pedidos/41` por `/pedidos/42` basta para alcançar o dado de outra pessoa, falha conhecida como IDOR.

O UUID não dispensa a verificação de permissão, que nenhuma medida dispensa, mas converte uma falha trivialmente explorável em outra que exigiria adivinhar 122 bits. Trata-se de defesa em profundidade.

Quanto à preferência pela versão 7 em detrimento da versão 4: o UUID v4 é integralmente aleatório, de modo que cada inserção recai em ponto arbitrário do índice B-tree, fragmentando-o e degradando a escrita. O v7 embute o instante de criação nos bits iniciais, razão pela qual os identificadores nascem ordenados e as inserções ocorrem sempre ao final do índice. Recupera-se, assim, a localidade do identificador sequencial sem recuperar sua previsibilidade.

**Uso de `TIMESTAMPTZ` em lugar de `TIMESTAMP`.** O instante é armazenado em UTC, com fuso. Sem a indicação de fuso, um horário gravado não admite interpretação inequívoca.

**Validação em duas camadas, Zod e `CHECK`.** A validação da aplicação protege o usuário, por meio de mensagem clara campo a campo, enquanto a constraint protege o dado contra um defeito futuro do código, um script de importação ou a execução direta de `INSERT` no `psql`.

### Parametrização das consultas

As consultas do repository consistem em chamadas ao cliente Prisma:

```ts
async findByEmail(email: string): Promise<UserRow | null> {
  return prisma.user.findUnique({ where: { email } });
}
```

O Prisma sempre emite SQL parametrizado e em nenhuma hipótese concatena valores ao texto do comando. O mecanismo de proteção é idêntico ao do SQL escrito à mão: o driver transmite o comando e os parâmetros em mensagens distintas do protocolo do PostgreSQL, de modo que o servidor compila o comando na etapa *Parse*, antes de receber o valor na etapa *Bind*. O conteúdo do parâmetro não dispõe, portanto, de meio para alterar um plano de execução já constituído.

Reside aí a diferença essencial: não se trata de escapar caracteres perigosos, abordagem que invariavelmente admite brechas, mas de assegurar que o dado jamais transite pelo canal em que comandos são interpretados.

### A não exposição do hash nas respostas

O campo `passwordHash` existe unicamente no tipo `UserRow`, gerado pelo Prisma. A função `toPublicUser()` converte a linha do banco no formato devolvido pela API, descartando o hash. Dado que todo controller declara retornar `PublicUser`, a tentativa de responder diretamente com um `UserRow` constitui erro de compilação; o vazamento deixa, assim, de depender de disciplina.

Com a adoção do Prisma, esse tipo tornou-se ainda mais confiável, pois `UserRow` não é escrito à mão, mas derivado do schema. Acrescentando-se uma coluna ou alterando-se seu tipo, o tipo correspondente acompanha a mudança e o compilador aponta todos os pontos afetados.

---

## 5. O processo de cadastro

A rota `POST /api/auth/register` percorre a cadeia `rateLimit` → `validateBody(registerSchema)` → `authController.register` → `authService.register`, nas seguintes etapas:

1. **Limitação de taxa**: admitem-se, no máximo, 20 cadastros por IP a cada 15 minutos.
2. **Validação por Zod**: o `validateBody` executa `registerSchema.parse(req.body)`, segundo as regras abaixo.
   - `name`: texto de 3 a 120 caracteres, submetido a `trim()`;
   - `email`: formato válido, até 255 caracteres, normalizado para minúsculas;
   - `password`: de 8 a 72 caracteres, contendo ao menos uma minúscula, uma maiúscula e um algarismo;
   - `confirmPassword`, opcional: quando enviado, deve coincidir com a senha;
   - `.strict()`: rejeita campos não previstos, o que obsta o *mass assignment*, isto é, o envio de `{"role": "admin"}` na expectativa de um `INSERT` descuidado.

   Em caso de falha, a resposta é `400`, acompanhada dos erros discriminados por campo:
   ```json
   {"success":false,"error":{"code":"BAD_REQUEST","message":"Dados inválidos.",
    "details":{"password":"A senha deve ter no mínimo 8 caracteres."}}}
   ```
   Convém destacar que o Zod não apenas valida, mas também transforma. As operações `.trim()` e `.toLowerCase()` devolvem o dado já normalizado, e o middleware substitui o `req.body` por esse resultado. Do controller em diante, é garantido que o nome chegou sem espaços nas extremidades e o e-mail em minúsculas.
3. **Verificação de duplicidade**: consulta-se o e-mail; havendo registro prévio, responde-se `409 Conflict`.
4. **Hash da senha**: executa-se `bcrypt.hash(senha, 12)`.
5. **Gravação**: emprega-se `INSERT ... RETURNING *`, que devolve a linha gravada já com o `id` e o `created_at` atribuídos pelo banco, dispensando um `SELECT` adicional. A senha em texto puro não alcança o banco em momento algum nem é registrada em log.
6. **Resposta `201 Created`**: acompanha um token JWT, de modo que o usuário ingresse na aplicação imediatamente após o cadastro.

### A condição de corrida e a insuficiência da verificação prévia

Entre a verificação descrita na terceira etapa e a inserção descrita na quinta existe uma janela temporal. Duas requisições simultâneas portando o mesmo e-mail podem intercalar-se e ambas transpor a verificação.

A garantia efetiva provém do índice único, aplicado atomicamente no `INSERT`. O service captura a violação e a converte na mesma mensagem destinada ao usuário:

```ts
if (isUniqueViolation(error, 'email')) {
  throw AppError.conflict('Este e-mail ja esta cadastrado.');
}
```

A detecção apoia-se no código de erro `P2002` do Prisma, correspondente a *unique constraint failed*, e não no texto da mensagem, que varia conforme a versão e o idioma do servidor. Trata-se do equivalente ao SQLSTATE `23505` do PostgreSQL, com a vantagem de manter-se idêntico em qualquer banco suportado pelo Prisma.

Em síntese: uma verificação em código de aplicação é conveniência, não garantia. A garantia de unicidade provém de constraint no banco.

---

## 6. O processo de autenticação

A rota `POST /api/auth/login` percorre a cadeia `rateLimit` → `validateBody(loginSchema)` → `authController.login` → `authService.login`:

1. **Limitação de taxa mais rigorosa**: 10 tentativas por IP a cada 15 minutos, com o propósito de dificultar ataques de força bruta.
2. **Validação**: as regras de *força* da senha não se aplicam nesta rota. Quem já possui conta precisa apenas informar a senha correta, qualquer que seja ela. Aplicar a regra de força no login inviabilizaria o acesso de usuários antigos e revelaria o formato das senhas aceitas pelo sistema.
3. **Busca pelo e-mail**, com comparação insensível à caixa.
4. **Comparação**: executa-se `bcrypt.compare(senhaDigitada, hashGravado)`.
5. **Sucesso**: responde-se `200`, com o usuário público e o `accessToken`.

### O tratamento das credenciais inválidas

As duas falhas possíveis, e-mail inexistente e senha incorreta, produzem exatamente a mesma resposta:

```
401 Unauthorized  →  { "code": "UNAUTHORIZED", "message": "E-mail ou senha inválidos." }
```

Fossem as mensagens distintas, como "e-mail não cadastrado" e "senha incorreta", um atacante poderia determinar quais e-mails possuem conta no sistema, ataque conhecido como *user enumeration*. De posse dessa lista, concentraria a força bruta apenas nos endereços válidos e disporia de base confirmada para phishing direcionado.

A identidade das mensagens, contudo, não é suficiente. A aferição dos tempos de resposta evidencia o motivo:

| Cenário | Operações | Tempo |
|---|---|---|
| E-mail não existe | 1 consulta, retorno imediato | ~5 ms |
| Senha errada | 1 consulta + `bcrypt.compare` | ~255 ms |

Essa diferença de aproximadamente 250 ms é trivialmente mensurável por script. Dito de outro modo, o tempo entregava exatamente a informação que as mensagens idênticas ocultavam.

Por essa razão, quando o e-mail não existe, o código ainda assim executa um `bcrypt.compare` contra um hash descartável:

```ts
if (!row) {
  await burnTimeLikeAVerification();
  throw AppError.unauthorized('E-mail ou senha invalidos.');
}
```

Conclui-se que a segurança não reside apenas no conteúdo da resposta: tempo, tamanho e ordem das operações constituem canais laterais pelos quais informação se evade.

---

## 7. A proteção da senha

### Hash, e não criptografia

A senha é submetida a bcrypt com custo 12. O hash é função de mão única: não existe operação que o desfaça. A criptografia, por ser reversível mediante chave, seria a escolha inadequada neste contexto, pois o vazamento da chave acarretaria o vazamento simultâneo de todas as senhas, e essa chave residiria no mesmo servidor que o atacante já teria comprometido.

Com o hash, nem o próprio sistema conhece a senha do usuário; é-lhe possível apenas verificar se determinada senha candidata produz o mesmo resultado.

A pergunta "como se recupera a senha de quem a esqueceu?" admite uma única resposta correta: não se recupera; substitui-se. Qualquer serviço capaz de remeter por e-mail a senha anterior armazena-a de forma reversível.

### A preferência pelo bcrypt em detrimento de SHA-256 ou MD5

SHA-256 e MD5 foram projetados para serem rápidos, característica excelente para a verificação de integridade de arquivos e inadequada para senhas:

| Algoritmo | Tentativas por segundo (1 GPU) |
|---|---|
| MD5 | ~100.000.000.000 |
| SHA-256 | ~10.000.000.000 |
| **bcrypt (custo 12)** | **~3.000** |

O bcrypt é deliberadamente lento e de custo configurável. O parâmetro `saltRounds = 12` corresponde a `2¹² = 4096` iterações internas, aproximadamente 250 ms por hash. O intervalo é imperceptível para quem efetua login uma vez e inviabiliza o ataque de dicionário. À medida que o hardware evolui, basta elevar o custo, que fica gravado no interior de cada hash, de modo que os hashes antigos permanecem válidos.

### A implementação nativa e suas implicações além do desempenho

O projeto utiliza o pacote `bcrypt`, compilado em C++, e não o `bcryptjs`, escrito em JavaScript puro. A diferença relevante não se restringe ao desempenho.

As funções assíncronas do pacote nativo, `hash` e `compare`, executam na thread pool do libuv. Durante os aproximadamente 250 ms de cálculo, o event loop permanece livre e o servidor continua atendendo outras requisições.

O `bcryptjs`, ao contrário, efetua o cálculo no event loop, isto é, na thread única do Node. Como o Node processa tudo nela, um hash de 250 ms bloqueia o processo inteiro durante esse intervalo: nenhuma outra requisição progride, inclusive aquelas sem relação alguma com autenticação. Sob vários logins simultâneos, a fila cresce rapidamente e o servidor aparenta estar travado.

Em outros termos: o custo deliberado do bcrypt, que constitui a defesa contra força bruta, converte-se em problema de disponibilidade quando pago no lugar errado. O pacote nativo o paga fora do caminho crítico.

O custo dessa escolha também deve ser enunciado: o pacote nativo requer um binário compatível com a versão do Node em uso. Ele distribui binários pré-compilados, os *prebuilds*, para as combinações mais comuns, e foi esse o caso neste projeto, em que a instalação ocorreu sem compilação; quando nenhum deles corresponde ao ambiente, porém, recai-se em compilação local, que exige ferramentas de build instaladas. O `bcryptjs` não apresenta tal inconveniente.

Registre-se, por fim, que existe um limite superior real para o custo: um valor excessivamente alto converte o login em amplificador de negação de serviço contra o próprio servidor.

### O salt automático

O bcrypt gera um salt aleatório por senha e o embute no próprio hash:

```
$2b$12$wdVnaAHjwO8Abu3dE6vdMuPdSr5AaVIdAxpwECXZkVGq70YzVPv26
 │  │  └──────────────────────┬──────────────────────────────┘
 │  │           salt (22 chars) + hash (31 chars)
 │  └── custo: 12 rounds
 └───── identificador do algoritmo (2b = bcrypt)
```

Sendo o salt distinto a cada cadastro, dois usuários que adotem a senha `PedraFilosofal7` terão hashes inteiramente diferentes. Tal propriedade inutiliza as *rainbow tables* e impede que, à inspeção do banco, se perceba que duas pessoas compartilham a mesma senha.

Como o salt e o custo residem dentro do hash, não existe coluna de salt. O `bcrypt.compare` lê esses parâmetros do próprio hash gravado, aplica o mesmo processo à senha recebida e compara os resultados em tempo constante, sem interromper na primeira divergência, o que previne *timing attacks*.

### O limite de 72 caracteres

O limite não é arbitrário: o bcrypt deriva do Blowfish e opera com chave de, no máximo, 72 bytes. Tudo o que exceda esse comprimento é silenciosamente desconsiderado. Aceitar senhas maiores conferiria ao usuário falsa sensação de segurança; por isso o schema as rejeita de modo explícito.

### Demais proteções aplicadas

- A senha em texto puro existe apenas em memória, durante a requisição; não é gravada nem registrada em log.
- A constraint `users_password_is_bcrypt` impede fisicamente a gravação de senha em texto puro.
- O cabeçalho `Cache-Control: no-store` é aplicado a toda a API. Sem ele, um proxy ou o cache em disco do navegador poderia reter a resposta do login, que contém o token, e tal resposta sobreviveria ao logout. Note-se que `no-cache` não cumpriria esse papel, pois permite o armazenamento e apenas exige revalidação; é `no-store` que o proíbe.
- A área restrita devolve exclusivamente dados do próprio usuário. Uma versão anterior incluía o total de usuários cadastrados; o campo foi removido porque o tamanho da base constitui informação de negócio e nenhuma relação guarda com a identificação de quem está autenticado.
- O `password_hash` é suprimido de toda resposta da API pela função `toPublicUser()`.
- A diretiva `express.json({ limit: '10kb' })` impede que um corpo de requisição excessivamente grande seja empregado para derrubar o processo.
- O `rateLimit` aplicado ao login dificulta a força bruta.
- O SQL parametrizado elimina a possibilidade de SQL Injection.
- O `JWT_SECRET` e as credenciais do banco residem no `.env`, arquivo incluído no `.gitignore`. A senha do banco é mascarada antes de qualquer registro em log.

---

## 8. O mecanismo de manutenção da sessão

O mecanismo adotado é o JWT (JSON Web Token), transmitido no cabeçalho `Authorization: Bearer <token>`.

### Anatomia do token

Um JWT compõe-se de três partes separadas por ponto: `header.payload.signature`.

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9      ← header  {"alg":"HS256","typ":"JWT"}
.eyJuYW1lIjoiQW5hIFBlcmluaSIsImVtYWlsIj…   ← payload {"sub":"1","name":"Helena Marino",…}
.xYtsV_t27sTrDDuhFe_Ikru49LKPhR5z4vc05Cb   ← assinatura
```

O payload deste sistema contém apenas `sub`, o identificador do usuário; `iat`, o instante de emissão; `exp`, o instante de expiração; e `iss`, o emissor:

```json
{
  "iat": 1791225280,
  "exp": 1791228880,
  "iss": "auth.system",
  "sub": "01a10d58-b676-740c-b557-b8aa805752c6"
}
```

### Minimização de dados: o que foi suprimido do payload

A primeira versão incluía `name` e `email` no token, com o propósito de economizar uma consulta ao banco. Tratava-se de um erro.

O contra-argumento imediato seria que *quem subtraiu o token já consegue invocar a API e obter esses dados*. Tal raciocínio, contudo, só se aplica quando o atacante detém o token e o acesso à API. Há cenários em que ele detém apenas o primeiro:

| Onde o token vaza | Consequência com PII no payload |
|---|---|
| Log de servidor, proxy ou ferramenta de rastreamento de erros | Nome e e-mail gravados em texto |
| Captura de tela, chamado de suporte, pipeline de CI | Dado pessoal exposto a quem o visualize |
| **XSS**, com o token em `localStorage` | O script exfiltra nome e e-mail **sem emitir requisição alguma** |

A inclusão de PII converte um incidente em dois. Observa-se, ademais, o princípio de minimização de dados da LGPD.

O custo da correção mostrou-se praticamente nulo: apenas o `dashboardController` lia esses campos a partir do token, e ele já consultava o banco, de modo que a alteração resumiu-se a um `Promise.all`. Houve, inclusive, ganho concomitante: os dados passaram a ser os vigentes, em lugar de uma fotografia do instante em que o token foi assinado.

Impõe-se aqui uma observação crítica, provavelmente a mais exigida em arguição. O payload é codificado em Base64Url, que constitui codificação e não criptografia. Qualquer pessoa de posse do token consegue ler-lhe o conteúdo, como faz o próprio front-end deste projeto, para exibir o payload na tela. Por isso ali figuram somente dados não sensíveis, jamais a senha ou o hash. O que a assinatura assegura não é sigilo, mas integridade: ninguém altera o payload sem invalidar a assinatura, por não dispor do `JWT_SECRET`. O JWT é, nesse sentido, um envelope transparente e lacrado: todos leem o conteúdo, mas ninguém substitui o papel interno sem romper o lacre.

A assinatura corresponde a `HMAC-SHA256(base64url(header) + "." + base64url(payload), JWT_SECRET)`. Caso um atacante substitua `"sub":"1"` por `"sub":"2"` a fim de fazer-se passar por outro usuário, o HMAC recalculado no servidor não coincidirá com a assinatura recebida, e o `jwt.verify` rejeitará a requisição com `401`.

### O middleware `requireAuth`

```
Authorization: Bearer <token>
        ↓ extractBearerToken()      → sem cabeçalho? 401
        ↓ jwt.verify()              → assinatura ruim ou expirado? 401
        ↓ req.user = { id, name, email }
        ↓ next()                    → só agora a requisição chega no controller
```

A verificação é puramente criptográfica, sem consulta ao banco. Reside aí a principal vantagem do JWT: por ser *stateless*, dispensa que o servidor mantenha tabela de sessões, o que viabiliza o escalonamento horizontal sem store compartilhado.

Duas travas de segurança são aplicadas no `jwt.verify`:

- **`algorithms: ['HS256']`**: a fixação do algoritmo bloqueia o ataque clássico do `"alg": "none"`, no qual o atacante altera o header para declarar ausência de assinatura e uma biblioteca mal configurada o aceita. A regra geral é a de nunca permitir que o token escolha como será validado.
- **`issuer`**: assegura que o token foi emitido por esta aplicação.

A validade é de uma hora. Inexistindo mecanismo de revogação, a expiração curta constitui a mitigação, por delimitar o pior caso decorrente de um token vazado.

### A existência de `req.user` em TypeScript

O tipo `Request` do Express não contempla o campo `user`. Em `src/types/express.d.ts`, recorre-se a *declaration merging* para acrescentá-lo:

```ts
declare global {
  namespace Express {
    interface Request { user?: Express.AuthenticatedUser }
  }
}
```

O campo é declarado opcional porque nem toda requisição transita pelo `requireAuth`; declará-lo obrigatório equivaleria a informar ao compilador algo falso. A consequência é que os controllers protegidos devem escrever `if (!req.user) throw AppError.unauthorized()`. Embora pareça burocracia, essa verificação constitui a última linha de defesa na hipótese de o `requireAuth` ser removido de uma rota por engano: o resultado permanece sendo `401`, e não um `500` originado de `undefined`.

Uma limitação de tipagem converteu-se, assim, em verificação de segurança.

### O armazenamento do token no cliente

No front-end de demonstração, o token é mantido em `localStorage`. O compromisso envolvido é o seguinte:

| Local | Vantagem | Risco |
|---|---|---|
| `localStorage` | Simples; imune a CSRF, por exigir leitura via JavaScript e anexação manual | Exposto a **XSS**: um script injetado consegue ler o token |
| Cookie `httpOnly` | Inacessível ao JavaScript, de modo que um XSS não subtrai o token | Enviado automaticamente pelo navegador, o que exige proteção contra **CSRF**, via `SameSite` ou token anti-CSRF |

Para um ambiente evolutivo maduro, a combinação de cookie `httpOnly`, `Secure` e `SameSite=Strict` constitui uma alternativa almejável.

---

## 9. Interface HTTP da aplicação

Todas as respostas observam um formato único: `{ success, message?, data? }` em caso de êxito e `{ success: false, error: { code, message, details? } }` em caso de erro. Tal uniformidade permite ao cliente implementar um único tratamento para a totalidade das chamadas.

A versão navegável e executável da tabela abaixo encontra-se em `/api/docs`, gerada automaticamente a partir dos schemas Zod.

| Método | Rota | Protegida | Descrição |
|---|---|---|---|
| `GET` | `/api/docs` | não | Documentação viva (Swagger UI) |
| `GET` | `/api/reference` | não | Documentação viva (Scalar) |
| `GET` | `/api/openapi.json` | não | Documento OpenAPI 3.1 |
| `GET` | `/api/health` | não | Verifica se a API está em operação |
| `POST` | `/api/auth/register` | não | Cadastra um usuário e devolve o token |
| `POST` | `/api/auth/login` | não | Autentica e devolve o token |
| `GET` | `/api/auth/me` | **sim** | Dados do usuário autenticado |
| `POST` | `/api/auth/logout` | **sim** | Orienta o cliente a descartar o token |
| `GET` | `/api/dashboard` | **sim** | Área restrita de exemplo |

### Códigos de status empregados

| Código | Circunstância |
|---|---|
| `200 OK` | Login e leituras bem-sucedidas |
| `201 Created` | Usuário cadastrado, com a criação efetiva de um recurso |
| `400 Bad Request` | Falha de validação (Zod) ou JSON malformado |
| `401 Unauthorized` | Credenciais inválidas, token ausente, inválido ou expirado |
| `404 Not Found` | Rota inexistente |
| `409 Conflict` | E-mail já cadastrado |
| `429 Too Many Requests` | Limite de requisições excedido |
| `500 Internal Server Error` | Erro inesperado, cujo detalhe permanece restrito ao log do servidor |

### Exemplos de invocação

```bash
# Cadastro
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Helena Marino","email":"helena.marino@exemplo.com","password":"EternalFlame7"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"helena.marino@exemplo.com","password":"EternalFlame7"}'

# Área restrita
curl http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer <COLE_O_TOKEN_AQUI>"
```

O arquivo `requests.http` reúne 15 cenários prontos, incluindo a totalidade dos casos de erro.
