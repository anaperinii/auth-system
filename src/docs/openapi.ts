import {
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from './extendZod';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import { env } from '../config/env';


const registry = new OpenAPIRegistry();


const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description:
    'Token JWT obtido em POST /auth/login ou POST /auth/register.\n\n' +
    'Cole apenas o token (sem a palavra "Bearer") no campo abaixo.\n\n' +
    'O payload de um JWT é apenas Base64Url, não criptografia: qualquer pessoa com o token ' +
    'lê o conteúdo. A assinatura garante integridade, não sigilo.\n\n' +
    'Justamente por isso o payload carrega SÓ o identificador do usuário (`sub`) e os claims ' +
    'de controle (`iat`, `exp`, `iss`). Nome e e-mail ficam de fora: são dados pessoais, e um ' +
    'token que vaze para um log não deve vazar PII junto.',
});


const publicUserSchema = z
  .object({
    id: z.string().openapi({ format: 'uuid', description: 'UUID v7. Não é sequencial: um id não revela quantos usuários existem nem permite adivinhar outro.', example: '6555bacc-a690-47e8-97f9-bd2fa789bc4e' }),
    name: z.string().openapi({ example: 'Helena Marino' }),
    email: z.string().openapi({ example: 'helena.marino@exemplo.com' }),
    createdAt: z.string().openapi({ format: 'date-time', example: '2026-10-05T12:49:20.526Z' }),
  })
  .openapi('PublicUser', {
    description:
      'Usuário como a API o devolve. Note a ausência de `password_hash`: ' +
      'a função `toPublicUser()` o descarta, e o tipo TypeScript impede que ele vaze por esquecimento.',
  });

const authResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().openapi({ example: 'Login realizado com sucesso.' }),
    data: z.object({
      user: publicUserSchema,
      accessToken: z.string().openapi({
        description:
          'JWT assinado em HS256. Validade de 1 hora (configurável em JWT_EXPIRES_IN). ' +
          'O payload contém apenas `sub`, `iat`, `exp` e `iss`, nenhum dado pessoal.',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3OTEyMjQ2ODksInN1YiI6IjYifQ.NMOCdSQdF7Ew',
      }),
      tokenType: z.literal('Bearer'),
    }),
  })
  .openapi('AuthResponse');

const errorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.object({
      code: z.string().openapi({
        description: 'Código estável para o cliente programático. A `message` é para humanos e pode mudar.',
        example: 'UNAUTHORIZED',
      }),
      message: z.string().openapi({ example: 'E-mail ou senha inválidos.' }),
      details: z
        .record(z.string())
        .optional()
        .openapi({
          description: 'Presente apenas em erros de validação: um par { campo: mensagem } por campo inválido.',
          example: { password: 'A senha deve ter no mínimo 8 caracteres.' },
        }),
    }),
  })
  .openapi('ErrorResponse');

const dashboardResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().openapi({
      example: 'Bem-vindo(a), Helena Marino! Este conteúdo apenas aparece para usuários autenticados.',
    }),
    data: z.object({
      user: z.object({
        id: z.string().openapi({ format: 'uuid', example: '6555bacc-a690-47e8-97f9-bd2fa789bc4e' }),
        name: z.string().openapi({ example: 'Helena Marino' }),
        email: z.string().openapi({ example: 'helena.marino@exemplo.com' }),
        memberSince: z.string().openapi({ format: 'date-time', example: '2026-10-05T12:49:20.526Z' }),
      }),
      serverTime: z.string().openapi({ format: 'date-time', example: '2026-10-05T12:49:38.733Z' }),
    }),
  })
  .openapi('DashboardResponse', {
    description:
      'A resposta devolve APENAS dados do próprio usuário autenticado. ' +
      'Uma versão anterior incluía o total de usuários cadastrados; foi removido porque o ' +
      'tamanho da base é informação de negócio e não tem relação com identificar quem está logado.',
  });

const profileResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().openapi({ example: 'Área restrita. Você está autenticado como Helena Marino.' }),
    data: z.object({ user: publicUserSchema }),
  })
  .openapi('ProfileResponse');

const simpleOkSchema = z
  .object({
    success: z.literal(true),
    message: z.string().openapi({ example: 'Logout efetuado. Descarte o token no cliente.' }),
  })
  .openapi('SimpleOkResponse');

const healthResponseSchema = z
  .object({
    success: z.literal(true),
    status: z.literal('ok'),
    uptimeSeconds: z.number().int().openapi({ example: 78 }),
  })
  .openapi('HealthResponse');


const jsonError = (description: string) => ({
  description,
  content: { 'application/json': { schema: errorResponseSchema } },
});


registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Sistema'],
  summary: 'Verifica se a API está no ar',
  description:
    'Rota pública. Responde 200 se o servidor subiu. Útil para confirmar que a aplicação ' +
    'conseguiu conectar ao PostgreSQL, já que a conexão é validada antes de o servidor aceitar requisições.',
  responses: {
    200: { description: 'API no ar.', content: { 'application/json': { schema: healthResponseSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/register',
  tags: ['Autenticação'],
  summary: 'Cadastra um usuário',
  description: [
    'Cria a conta e **já devolve um token**, para o usuário entrar direto sem precisar fazer login em seguida.',
    '',
    'Cadeia de middlewares: `rateLimit` (20 por IP a cada 15 min) -> `validateBody(registerSchema)` -> controller.',
    '',
    '**A senha nunca é gravada em texto puro.** Ela passa por `bcrypt.hash(senha, 12)` e o banco ainda',
    'tem uma constraint `CHECK` que rejeita fisicamente qualquer valor fora do formato `$2[aby]$NN$...`.',
    '',
    'O corpo é **estrito**: campos não previstos causam 400. Isso bloqueia *mass assignment*',
    '(por exemplo, enviar `"role": "admin"` esperando que entre no INSERT).',
  ].join('\n'),
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: registerSchema } },
    },
  },
  responses: {
    201: {
      description: 'Usuário criado. Um recurso novo passou a existir, por isso 201 e não 200.',
      content: { 'application/json': { schema: authResponseSchema } },
    },
    400: jsonError('Falha de validação. O campo `error.details` traz uma mensagem por campo inválido.'),
    409: jsonError('O e-mail já está cadastrado. Garantido pelo índice único sobre a coluna `CITEXT`, que compara ignorando maiúsculas. O Prisma reporta isso como `P2002`.'),
    429: jsonError('Limite de tentativas excedido. O cabeçalho `Retry-After` informa quantos segundos esperar.'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['Autenticação'],
  summary: 'Autentica e devolve o token',
  description: [
    'Cadeia de middlewares: `rateLimit` (10 por IP a cada 15 min) -> `validateBody(loginSchema)` -> controller.',
    '',
    '**Credenciais inválidas sempre respondem a mesma coisa.** E-mail inexistente e senha errada devolvem',
    '401 com a mensagem idêntica `"E-mail ou senha inválidos."`. Mensagens diferentes permitiriam descobrir',
    'quais e-mails têm conta no sistema (*user enumeration*).',
    '',
    'E não basta a mensagem: quando o e-mail não existe, o código ainda executa um `bcrypt.compare`',
    'descartável para gastar o mesmo tempo. Sem isso, a resposta voltaria em ~5 ms contra ~350 ms do',
    'caso "senha errada", e a diferença entregaria a informação que a mensagem idêntica escondia.',
  ].join('\n'),
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: loginSchema } },
    },
  },
  responses: {
    200: { description: 'Autenticado.', content: { 'application/json': { schema: authResponseSchema } } },
    400: jsonError('Falha de validação (e-mail mal formatado ou senha vazia).'),
    401: jsonError('Credenciais inválidas. Mensagem idêntica para e-mail inexistente e senha errada.'),
    429: jsonError('Limite de tentativas excedido.'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/auth/me',
  tags: ['Área restrita'],
  summary: 'Dados do usuário autenticado',
  security: [{ [bearerAuth.name]: [] }],
  description: [
    'Rota **protegida**. O `requireAuth` valida o token antes de a requisição chegar ao controller.',
    '',
    'Diferente do `requireAuth` (que é puramente criptográfico, sem I/O), este endpoint **consulta o banco**',
    'por dois motivos: devolver dados atuais, caso o usuário tenha mudado o nome depois da emissão do token;',
    'e confirmar que a conta ainda existe, já que um token continua criptograficamente válido até expirar.',
  ].join('\n'),
  responses: {
    200: { description: 'Perfil do usuário.', content: { 'application/json': { schema: profileResponseSchema } } },
    401: jsonError('Token ausente, inválido, expirado, ou usuário removido após a emissão do token.'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  tags: ['Área restrita'],
  summary: 'Encerra a sessão do lado do cliente',
  security: [{ [bearerAuth.name]: [] }],
  description: [
    '**Este endpoint não faz nada no servidor, e isso é a verdade sobre JWT stateless.**',
    '',
    'Como o servidor não guarda sessão, "invalidar" um token exigiria uma lista de tokens revogados,',
    'o que reintroduziria exatamente o estado que o JWT se propôs a eliminar. O token continua válido',
    'até expirar (1 hora por padrão).',
    '',
    'O endpoint existe para dar ao cliente um lugar canônico para sinalizar a intenção de sair, e é o',
    'ponto de extensão natural para quando houver blacklist em Redis ou refresh token revogável.',
  ].join('\n'),
  responses: {
    200: { description: 'Orientação para descartar o token.', content: { 'application/json': { schema: simpleOkSchema } } },
    401: jsonError('Token ausente, inválido ou expirado.'),
  },
});

registry.registerPath({
  method: 'get',
  path: '/dashboard',
  tags: ['Área restrita'],
  summary: 'Área restrita de exemplo',
  security: [{ [bearerAuth.name]: [] }],
  description: [
    'É o requisito "área que só pode ser acessada por usuário autenticado".',
    '',
    'Sem o cabeçalho `Authorization`, o `requireAuth` responde 401 e a requisição **nunca chega ao controller**.',
    'A mensagem traz o nome de quem está logado, demonstrando que o sistema sabe **quem** está do outro lado,',
    'e não apenas que alguém está autenticado.',
  ].join('\n'),
  responses: {
    200: { description: 'Conteúdo restrito.', content: { 'application/json': { schema: dashboardResponseSchema } } },
    401: jsonError('Token ausente, inválido ou expirado.'),
  },
});


export function buildOpenApiDocument(): ReturnType<OpenApiGeneratorV31['generateDocument']> {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'auth.system',
      version: '1.0.0',
      description: [
        'API REST de cadastro de usuários e autenticação.',
        '',
        '**Stack:** Node.js + Express 5 + TypeScript + PostgreSQL + bcrypt + JWT + Zod.',
        '',
        '---',
        '',
        '### Como testar aqui mesmo',
        '',
        '1. Abra `POST /auth/register` e clique em **Try it out** / **Test Request**.',
        '2. Envie o corpo de exemplo (já vem preenchido) e execute.',
        '3. Copie o valor de `data.accessToken` da resposta.',
        '4. Clique em **Authorize** no topo da página e cole o token (sem a palavra `Bearer`).',
        '5. Agora as rotas de **Área restrita** respondem 200. Tente antes de autorizar: respondem 401.',
        '',
        '---',
        '',
        '### Esta documentação é gerada a partir do código',
        '',
        'Não existe arquivo YAML descrevendo esta API. Os schemas que validam as requisições',
        '(`src/schemas/auth.schema.ts`) são os mesmos que geram este documento, via',
        '`@asteasolutions/zod-to-openapi`.',
        '',
        'Consequência prática: mudar a regra da senha de 8 para 10 caracteres no schema altera',
        'o `minLength` exibido aqui automaticamente. Com um YAML escrito à mão, os dois',
        'divergiriam na primeira alteração, e documentação de API desatualizada é pior que',
        'nenhuma, porque induz quem a lê ao erro.',
        '',
        '### Segurança, em uma linha cada',
        '',
        '- Senha protegida por **bcrypt custo 12**, com salt aleatório embutido no próprio hash.',
        '- O banco tem uma constraint `CHECK` que **rejeita fisicamente** senha em texto puro.',
        '- Credenciais inválidas respondem sempre igual, **em mensagem e em tempo**.',
        '- Todo SQL é parametrizado (`$1`, `$2`), o que elimina SQL Injection.',
        '- O corpo das requisições é **estrito**: campo não previsto causa 400.',
      ].join('\n'),
      license: { name: 'MIT' },
    },
    servers: [
      {
        url: `http://localhost:${env.port}/api`,
        description: 'Servidor local de desenvolvimento',
      },
    ],
    tags: [
      { name: 'Autenticação', description: 'Cadastro e login. Rotas públicas.' },
      { name: 'Área restrita', description: 'Exigem `Authorization: Bearer <token>`. Respondem 401 sem token válido.' },
      { name: 'Sistema', description: 'Verificação de disponibilidade.' },
    ],
  });
}
