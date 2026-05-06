import Joi from 'joi';

/**
 * Schema de validação para POST /auth/login.
 * Garante que matricula e password sejam strings válidas antes de
 * chegar ao controller — evita PrismaClientValidationError com inputs
 * malformados e reduz superfície de ataque com inputs inesperados.
 */
export const loginSchema = Joi.object({
  matricula: Joi.string().trim().min(1).max(50).required()
    .messages({
      'string.empty': 'Matrícula é obrigatória',
      'any.required': 'Matrícula é obrigatória',
    }),
  password: Joi.string().min(1).max(128).required()
    .messages({
      'string.empty': 'Senha é obrigatória',
      'any.required': 'Senha é obrigatória',
    }),
});
