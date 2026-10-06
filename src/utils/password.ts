import bcrypt from 'bcrypt';
import { env } from '../config/env';

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, env.bcryptSaltRounds);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

const DUMMY_HASH = bcrypt.hashSync('senha-inexistente-apenas-para-gastar-tempo', env.bcryptSaltRounds);

export async function burnTimeLikeAVerification(): Promise<void> {
  await bcrypt.compare('qualquer-coisa', DUMMY_HASH);
}
