// =============================================================================
// 📋 VALIDAÇÃO DE DADOS DE CRAS COM JOI
// =============================================================================

import Joi from 'joi';

const nomeRule = Joi.string().trim().min(3).max(150).messages({
  'string.min': 'Nome deve ter pelo menos 3 caracteres',
  'string.max': 'Nome deve ter no máximo 150 caracteres',
  'any.required': 'Nome é obrigatório',
  'string.empty': 'Nome não pode ser vazio',
});

const enderecoRule = Joi.string().trim().min(5).max(300).messages({
  'string.min': 'Endereço deve ter pelo menos 5 caracteres',
  'string.max': 'Endereço deve ter no máximo 300 caracteres',
  'any.required': 'Endereço é obrigatório',
  'string.empty': 'Endereço não pode ser vazio',
});

const telefoneRule = Joi.string()
  .trim()
  .pattern(/^[\d()\s\-+]{7,20}$/)
  .allow(null, '')
  .messages({
    'string.pattern.base': 'Telefone deve conter apenas dígitos, parênteses, espaços ou hífen (7-20 caracteres)',
    'string.max': 'Telefone deve ter no máximo 20 caracteres',
  });

// Schema para CRIAÇÃO de CRAS
export const createCrasSchema = Joi.object({
  nome: nomeRule.required(),
  endereco: enderecoRule.required(),
  telefone: telefoneRule.optional(),
});

// Schema para ATUALIZAÇÃO de CRAS (todos os campos opcionais)
export const updateCrasSchema = Joi.object({
  nome: nomeRule.optional(),
  endereco: enderecoRule.optional(),
  telefone: telefoneRule.optional(),
});

// =============================================================================
// Middleware de validação genérico (mesmo padrão do userValidator)
// =============================================================================
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true, // remove campos não declarados no schema (anti mass-assignment)
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        message: 'Erro de validação',
        errors: messages,
      });
    }

    req.body = value;
    next();
  };
};
