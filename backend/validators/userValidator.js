// =============================================================================
// 📋 VALIDAÇÃO DE DADOS DE USUÁRIO COM JOI
// =============================================================================
// Centraliza todas as regras de validação para operações de usuário,
// eliminando validação manual repetitiva nos controllers.

import Joi from 'joi';

// Roles permitidos no sistema
const ALLOWED_ROLES = ['admin', 'entrevistador', 'recepcao'];

// Regras reutilizáveis
const nameRule = Joi.string().trim().min(3).max(100).messages({
  'string.min': 'Nome deve ter pelo menos 3 caracteres',
  'string.max': 'Nome deve ter no máximo 100 caracteres',
  'any.required': 'Nome é obrigatório',
  'string.empty': 'Nome não pode ser vazio',
});

const passwordRule = Joi.string().min(8).max(128).messages({
  'string.min': 'Senha deve ter pelo menos 8 caracteres',
  'string.max': 'Senha deve ter no máximo 128 caracteres',
  'any.required': 'Senha é obrigatória',
  'string.empty': 'Senha não pode ser vazia',
});

const roleRule = Joi.string().valid(...ALLOWED_ROLES).messages({
  'any.only': `Role inválido. Valores permitidos: ${ALLOWED_ROLES.join(', ')}`,
  'any.required': 'Role é obrigatório',
});

const matriculaRule = Joi.string().trim().min(1).max(50).messages({
  'any.required': 'Matrícula é obrigatória',
  'string.empty': 'Matrícula não pode ser vazia',
  'string.max': 'Matrícula deve ter no máximo 50 caracteres',
});

const crasRule = Joi.string().trim().min(1).max(50).messages({
  'string.base': 'CRAS deve ser um ID válido',
});
// Schema para CRIAÇÃO de usuário
// =============================================================================
export const createUserSchema = Joi.object({
  name: nameRule.required(),
  password: passwordRule.required(),
  role: roleRule.required(),
  matricula: matriculaRule.required(),
  cras: crasRule.optional().allow(null, ''),
})
  .custom((value, helpers) => {
    // Normalizar string vazia para null
    if (value.cras === '') value.cras = null;
    const { role, cras } = value;

    // Admin NÃO deve ter CRAS
    if (role === 'admin' && cras) {
      return helpers.error('any.custom', {
        message: 'Administradores não devem ter CRAS associado',
      });
    }

    // Entrevistador e Recepção DEVEM ter CRAS
    if ((role === 'entrevistador' || role === 'recepcao') && !cras) {
      return helpers.error('any.custom', {
        message: 'CRAS é obrigatório para entrevistadores e recepção',
      });
    }

    return value;
  })
  .messages({
    'any.custom': '{{#message}}',
  });

// =============================================================================
// Schema para ATUALIZAÇÃO de usuário
// =============================================================================
export const updateUserSchema = Joi.object({
  name: nameRule.optional(),
  password: passwordRule.optional(),
  role: roleRule.optional(),
  matricula: matriculaRule.optional(),
  cras: crasRule.optional().allow(null, ''),
  agenda: Joi.object({
    horariosDisponiveis: Joi.array().items(
      Joi.string().pattern(/^\d{2}:\d{2}$/).messages({
        'string.pattern.base': 'Horário deve estar no formato HH:MM',
      })
    ).optional(),
    diasAtendimento: Joi.array().items(
      Joi.number().integer().min(0).max(6).messages({
        'number.min': 'Dia da semana deve ser entre 0 (Domingo) e 6 (Sábado)',
        'number.max': 'Dia da semana deve ser entre 0 (Domingo) e 6 (Sábado)',
      })
    ).optional(),
  }).optional(),
})
  .custom((value, helpers) => {
    // Normalizar string vazia para null
    if (value.cras === '') value.cras = null;
    const { role, cras } = value;

    if (role === 'admin' && cras) {
      return helpers.error('any.custom', {
        message: 'Administradores não devem ter CRAS associado',
      });
    }

    if ((role === 'entrevistador' || role === 'recepcao') && !cras) {
      return helpers.error('any.custom', {
        message: 'CRAS é obrigatório para entrevistadores e recepção',
      });
    }

    return value;
  })
  .messages({
    'any.custom': '{{#message}}',
  });

// =============================================================================
// Middleware de validação genérico
// =============================================================================

/**
 * Cria um middleware Express que valida req.body contra o schema Joi fornecido.
 * Retorna 400 com detalhes dos erros se a validação falhar.
 *
 * @param {Joi.ObjectSchema} schema - Schema Joi para validação
 * @returns {Function} Middleware Express
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Retorna todos os erros, não apenas o primeiro
      stripUnknown: true, // Remove campos não definidos no schema
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        message: 'Erro de validação',
        errors: messages,
      });
    }

    // Substitui body pelos dados validados e sanitizados
    req.body = value;
    next();
  };
};
