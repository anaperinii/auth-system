import { useCallback, useEffect, useState } from 'react';
import { api, decodeJwtPayload, token, type AuthData, type DashboardResult } from './api';
import { getGreeting, getLastName, getMinutesUntil } from './lib/format';
import { Badge } from './components/Badge';
import { Stage } from './components/Stage';
import { LoginForm, RegisterForm } from './components/AuthForms';
import { Dashboard } from './components/Dashboard';

type View = 'login' | 'register' | 'session';

const STAGE_COPY = {
  login: { title: 'Entrar', subtitle: 'Use o e-mail e a senha da sua conta' },
  register: { title: 'Criar conta', subtitle: 'Leva menos de um minuto' },
} as const;

export function App() {
  const [view, setView] = useState<View>('login');
  const [session, setSession] = useState<DashboardResult | null>(null);

  const openSession = useCallback(async (): Promise<void> => {
    try {
      setSession(await api.dashboard());
      setView('session');
    } catch {
      token.clear();
      setView('login');
    }
  }, []);

  useEffect(() => {
    if (token.get()) void openSession();
  }, [openSession]);

  function handleAuthSuccess(auth: AuthData): void {
    token.set(auth.accessToken);
    void openSession();
  }

  function handleLogout(): void {
    token.clear();
    setSession(null);
    setView('login');
  }

  let stageTitle: string;
  let stageSubtitle: string;

  if (view === 'session' && session) {
    const minutesLeft = getMinutesUntil(decodeJwtPayload(token.get() ?? '')?.['exp']);

    stageTitle = `${getGreeting()}, ${getLastName(session.data.user.name)}`;
    stageSubtitle =
      minutesLeft === null
        ? 'Sessão ativa'
        : `Sessão ativa · o token expira em ${minutesLeft} min`;
  } else {
    const copy = view === 'register' ? STAGE_COPY.register : STAGE_COPY.login;
    stageTitle = copy.title;
    stageSubtitle = copy.subtitle;
  }

  return (
    <main className="card">
      <Stage title={stageTitle} subtitle={stageSubtitle} />

      <section className="panel">
        <Badge isLocked={view === 'session'} />

        {view === 'session' && session ? (
          <Dashboard result={session} onLogout={handleLogout} />
        ) : (
          <div className="view">
            <div className="panel-head">
              <div className="eyebrow">Acesso</div>

              <div className="tabs" role="tablist">
                <button
                  className="tab"
                  type="button"
                  role="tab"
                  aria-selected={view === 'login'}
                  onClick={() => setView('login')}
                >
                  Entrar
                </button>
                <button
                  className="tab"
                  type="button"
                  role="tab"
                  aria-selected={view === 'register'}
                  onClick={() => setView('register')}
                >
                  Criar conta
                </button>
              </div>
            </div>

            {view === 'login' ? (
              <LoginForm key="login" onSuccess={handleAuthSuccess} />
            ) : (
              <RegisterForm key="register" onSuccess={handleAuthSuccess} />
            )}
          </div>
        )}
      </section>
    </main>
  );
}
