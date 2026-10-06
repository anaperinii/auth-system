import { AppError } from '../errors/AppError';
import { isUniqueViolation, toPublicUser, userModel, type PublicUser } from '../models/user.model';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';
import { burnTimeLikeAVerification, hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken } from '../utils/jwt';

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  tokenType: 'Bearer';
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await userModel.findByEmail(input.email);

    if (existing) {
      throw AppError.conflict('Este e-mail já está cadastrado.');
    }

    const passwordHash = await hashPassword(input.password);

    let created;
    try {
      created = await userModel.create({
        name: input.name,
        email: input.email,
        passwordHash,
      });
    } catch (error) {
      if (isUniqueViolation(error, 'email')) {
        throw AppError.conflict('Este e-mail já está cadastrado.');
      }
      throw error;
    }

    const user = toPublicUser(created);

    return {
      user,
      accessToken: signAccessToken(created),
      tokenType: 'Bearer',
    };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const row = await userModel.findByEmail(input.email);

    if (!row) {
      await burnTimeLikeAVerification();
      throw AppError.unauthorized('E-mail ou senha inválidos.');
    }

    const passwordMatches = await verifyPassword(input.password, row.passwordHash);

    if (!passwordMatches) {
      throw AppError.unauthorized('E-mail ou senha inválidos.');
    }

    return {
      user: toPublicUser(row),
      accessToken: signAccessToken(row),
      tokenType: 'Bearer',
    };
  },

  async getProfile(userId: string): Promise<PublicUser> {
    const row = await userModel.findById(userId);

    if (!row) {
      throw AppError.unauthorized('Usuário do token não existe mais.');
    }

    return toPublicUser(row);
  },
};
