import { useId } from 'react';

interface FieldProps {
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string | undefined;
}

export function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}: FieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>

      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />

      <span className="field-error" id={errorId}>
        {error}
      </span>
    </div>
  );
}
