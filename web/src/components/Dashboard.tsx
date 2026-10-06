import { token, type DashboardResult } from '../api';
import { formatDateTime } from '../lib/format';

interface DashboardProps {
  result: DashboardResult;
  onLogout: () => void;
}

interface RowProps {
  label: string;
  value: string | number;
  title?: string;
}

function Row({ label, value, title }: RowProps) {
  return (
    <div className="row">
      <dt>{label}</dt>
      <dd title={title}>{value}</dd>
    </div>
  );
}

export function Dashboard({ result, onLogout }: DashboardProps) {
  const { message, data } = result;
  const { user } = data;
  const accessToken = token.get() ?? '';

  const payload = accessToken ? JSON.parse(atob(accessToken.split('.')[1] ?? '')) : {};

  return (
    <div className="view">
      <div className="panel-head">
        <div className="eyebrow">Área restrita</div>
      </div>

      <div className="alert" data-kind="success">
        {message}
      </div>

      <div className="section-title">Sessão autenticada</div>

      <dl>
        <Row label="Nome" value={user.name} />
        <Row label="E-mail" value={user.email} />

        <Row
          label="ID do usuário"
          value={`${user.id.slice(0, 8)}…${user.id.slice(-4)}`}
          title={user.id}
        />

        <Row label="Membro desde" value={formatDateTime(user.memberSince)} />
        <Row label="Servidor em" value={formatDateTime(data.serverTime)} />
      </dl>

      <div className="rule" />

      <p className="hint" style={{ marginTop: 0 }}>
        Os dados acima vêm de <strong>GET /api/dashboard</strong>, rota que só responde com o
        cabeçalho <strong>Authorization: Bearer &lt;token&gt;</strong>.
      </p>

      <details>
        <summary>Token JWT em uso</summary>
        <p className="hint">
          O payload é apenas Base64Url, portanto qualquer pessoa consegue ler. A assinatura
          garante <strong>integridade</strong>, não sigilo. Por isso ele carrega só o
          identificador do usuário, e nenhum dado pessoal.
        </p>
        <pre>
          {accessToken}
          {'\n\npayload decodificado:\n'}
          {JSON.stringify(payload, null, 2)}
        </pre>
      </details>

      <details>
        <summary>Resposta JSON completa</summary>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </details>

      <button className="btn-ghost" type="button" onClick={onLogout}>
        Sair
      </button>
    </div>
  );
}
