// =============================================================================
// 📋 VALIDAÇÃO DE DADOS DE AGENDAMENTO COM JOI
// =============================================================================
// stripUnknown: true em todos os schemas previne mass-assignment
// (campos não declarados são silenciosamente removidos antes de chegar ao service)

import Joi from 'joi';

// Valores válidos de motivo: labels do frontend OU valores do enum PostgreSQL
const MOTIVOS_VALIDOS = [
  'Atualização Cadastral', 'Inclusão', 'Transferência de Município', 'Orientações Gerais',
  'atualizacao_cadastral', 'inclusao', 'transferencia_municipio', 'orientacoes_gerais',
];

const STATUS_VALIDOS = ['agendado', 'realizado', 'ausente'];

// Regras reutilizáveis
const idRule = Joi.string().trim().min(1).max(50).alphanum();
const pessoaRule = Joi.string().trim().min(2).max(200);
const cpfRule = Joi.string().trim().min(11).max(14); // "12345678900" ou "123.456.789-00"
const telefoneRule = Joi.string().trim().min(10).max(20);
const motivoRule = Joi.string().valid(...MOTIVOS_VALIDOS);
const dataRule = Joi.string().isoDate().messages({
  'string.isoDate': 'Data deve estar no formato ISO 8601 (ex: 2026-05-20T09:00:00)',
});
const statusRule = Joi.string().valid(...STATUS_VALIDOS);
const observacoesRule = Joi.string().trim().max(1000).allow(null, '');

// =============================================================================
// Schema para CRIAÇÃO de agendamento
// =============================================================================
export const createAppointmentSchema = Joi.object({
  entrevistador: idRule.required().messages({
    'any.required': 'Entrevistador é obrigatório',
    'string.empty': 'Entrevistador não pode ser vazio',
  }),
  cras: idRule.required().messages({
    'any.required': 'CRAS é obrigatório',
    'string.empty': 'CRAS não pode ser vazio',
  }),
  pessoa: pessoaRule.required().messages({
    'any.required': 'Nome da pessoa é obrigatório',
    'string.max': 'Nome deve ter no máximo 200 caracteres',
  }),
  cpf: cpfRule.required().messages({
    'any.required': 'CPF é obrigatório',
  }),
  telefone1: telefoneRule.required().messages({
    'any.required': 'Telefone é obrigatório',
  }),
  telefone2: telefoneRule.optional().allow(null, ''),
  motivo: motivoRule.required().messages({
    'any.required': 'Motivo é obrigatório',
    'any.only': `Motivo inválido. Valores permitidos: ${MOTIVOS_VALIDOS.slice(0, 4).join(', ')}`,
  }),
  data: dataRule.required().messages({
    'any.required': 'Data é obrigatória',
  }),
  status: statusRule.optional(),
  observacoes: observacoesRule.optional(),
});

// =============================================================================
// Schema para ATUALIZAÇÃO parcial de agendamento (PATCH / PUT)
// =============================================================================
export const updateAppointmentSchema = Joi.object({
  entrevistador: idRule.optional(),
  cras: idRule.optional(),
  pessoa: pessoaRule.optional(),
  cpf: cpfRule.optional(),
  telefone1: telefoneRule.optional(),
  telefone2: telefoneRule.optional().allow(null, ''),
  motivo: motivoRule.optional(),
  data: dataRule.optional(),
  status: statusRule.optional(),
  observacoes: observacoesRule.optional(),
});

// =============================================================================
// Middleware de validação genérico
// =============================================================================
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true, // remove campos não declarados (anti mass-assignment)
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
