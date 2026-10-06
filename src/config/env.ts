import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`${name} ausente no .env`);
  }

  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} deve ser inteiro, veio "${raw}"`);
  }

  return parsed;
}

const jwtSecret = required('JWT_SECRET');
const databaseUrl = required('DATABASE_URL');

export const env = {
  port: optionalNumber('PORT', 3000),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  bcryptSaltRounds: optionalNumber('BCRYPT_SALT_ROUNDS', 12),
  databaseUrl,
  poolMax: optionalNumber('PGPOOL_MAX', 10),
} as const;

export function describeDatabase(): string {
  try {
    const url = new URL(env.databaseUrl);
    const user = url.username || '(sem usuário)';
    return `${user}@${url.host}${url.pathname}`;
  } catch {
    return 'DATABASE_URL invalida';
  }
}
