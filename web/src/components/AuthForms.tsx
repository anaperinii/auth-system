import { useState, type FormEvent } from 'react';
import { ApiError, api, type AuthData, type FieldErrors } from '../api';
import { Field } from './Field';

interface AuthFormProps {
  onSuccess: (auth: AuthData) => void;
}

function useAuthSubmit(onSuccess: (auth: AuthData) => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(sendRequest: () => Promise<AuthData>): Promise<void> {
    setIsSubmitting(true);
    setAlertMessage(null);
    setFieldErrors({});

    try {
      onSuccess(await sendRequest());
    } catch (error) {
      if (error instanceof ApiError) {
        setAlertMessage(error.message);
        setFieldErrors(error.fieldErrors ?? {});
      } else {
        setAlertMessage('Não foi possível falar com o servidor.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, alertMessage, fieldErrors, submit };
}

function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="alert" data-kind="error" role="alert">
      {message}
    </div>
  );
}

export function LoginForm({ onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { isSubmitting, alertMessage, fieldErrors, submit } = useAuthSubmit(onSuccess);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    void submit(() => api.login(email, password));
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ErrorAlert message={alertMessage} />

      <Field
        label="E-mail"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="você@exemplo.com"
        autoComplete="email"
        error={fieldErrors['email']}
      />

      <Field
        label="Senha"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="current-password"
        error={fieldErrors['password']}
      />

      <button className="btn-primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Aguarde…' : 'Entrar'}
      </button>
    </form>
  );
}

export function RegisterForm({ onSuccess }: AuthFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { isSubmitting, alertMessage, fieldErrors, submit } = useAuthSubmit(onSuccess);

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    void submit(() => api.register({ name, email, password, confirmPassword }));
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ErrorAlert message={alertMessage} />

      <Field
        label="Nome"
        type="text"
        value={name}
        onChange={setName}
        placeholder="Seu nome completo"
        autoComplete="name"
        error={fieldErrors['name']}
      />

      <Field
        label="E-mail"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="você@exemplo.com"
        autoComplete="email"
        error={fieldErrors['email']}
      />

      <Field
        label="Senha"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="new-password"
        error={fieldErrors['password']}
      />

      <Field
        label="Confirmar senha"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="••••••••"
        autoComplete="new-password"
        error={fieldErrors['confirmPassword']}
      />

      <button className="btn-primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Aguarde…' : 'Criar conta'}
      </button>

      <p className="hint">
        Mínimo 8 caracteres, com ao menos uma maiúscula, uma minúscula e um número.
      </p>
    </form>
  );
}
