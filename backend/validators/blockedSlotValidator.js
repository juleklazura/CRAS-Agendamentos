import Joi from 'joi';

export const createBlockedSlotSchema = Joi.object({
  data: Joi.string().isoDate().required().messages({
    'any.required': 'Data é obrigatória',
    'string.base': 'Data deve ser uma string',
    'string.isoDate': 'Data deve estar no formato ISO 8601 (ex: 2026-05-03T14:00:00)',
  }),
  motivo: Joi.string().trim().max(500).optional().allow(null, '').messages({
    'string.max': 'Motivo deve ter no máximo 500 caracteres',
  }),
}).options({ stripUnknown: true });
