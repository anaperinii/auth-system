import { z } from '../docs/extendZod';

const nameSchema = z
  .string({ required_error: 'O nome é obrigatório.', invalid_type_error: 'O nome deve ser um texto.' })
  .trim()
  .min(3, 'O nome deve ter no mínimo 3 caracteres.')
  .max(120, 'O nome deve ter no máximo 120 caracteres.')
  .openapi({ description: 'Nome completo do usuário. Espaços nas pontas são removidos.', example: 'Helena Marino' });

const emailSchema = z
  .string({ required_error: 'O e-mail é obrigatório.', invalid_type_error: 'O e-mail deve ser um texto.' })
  .trim()
  .toLowerCase()
  .email('Informe um e-mail válido.')
  .max(255, 'O e-mail deve ter no máximo 255 caracteres.')
  .openapi({
    format: 'email',
    description: 'E-mail do usuário. É normalizado para minúsculas antes de ser gravado.',
    example: 'helena.marino@exemplo.com',
  });

const passwordSchema = z
  .string({ required_error: 'A senha é obrigatória.', invalid_type_error: 'A senha deve ser um texto.' })
  .min(8, 'A senha deve ter no mínimo 8 caracteres.')
  .max(72, 'A senha deve ter no máximo 72 caracteres (limite do algoritmo bcrypt).')
  .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula.')
  .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula.')
  .regex(/[0-9]/, 'A senha deve conter ao menos um número.')
  .openapi({
    format: 'password',
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,72}$',
    description:
      'Mínimo 8 e máximo 72 caracteres, com ao menos uma letra minúscula, uma maiúscula e um número. ' +
      'O limite de 72 vem do algoritmo bcrypt, que ignora tudo que passa disso.',
    example: 'PedraFilosofal7',
  });

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().optional().openapi({
      description: 'Opcional. Se enviado, precisa ser idêntico à senha. Existe para o formulário do front-end.',
      example: 'PedraFilosofal7',
    }),
  })
  .strict()
  .refine(
    (data) => data.confirmPassword === undefined || data.confirmPassword === data.password,
    { message: 'As senhas não conferem.', path: ['confirmPassword'] },
  )
  .openapi('RegisterRequest');

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z
      .string({ required_error: 'A senha é obrigatória.' })
      .min(1, 'A senha é obrigatória.')
      .openapi({
        format: 'password',
        description:
          'A senha cadastrada. Note que aqui NÃO se aplicam as regras de força do cadastro: ' +
          'quem já tem conta precisa apenas informar a senha correta, seja ela qual for.',
        example: 'PedraFilosofal7',
      }),
  })
  .strict()
  .openapi('LoginRequest');

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
