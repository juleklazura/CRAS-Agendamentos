import logger from '../utils/logger.js';
import { formatDateTime } from '../utils/timezone.js';
import { apiSuccess, apiMessage, apiError } from '../utils/apiResponse.js';
// Controller para gerenciamento de bloqueios de horário
// Permite que APENAS ENTREVISTADORES bloqueiem horários específicos em suas próprias agendas
import Log from '../models/Log.js';
import BlockedSlot from '../models/BlockedSlot.js';
import User from '../models/User.js';

// Função para criar bloqueio de horário (APENAS entrevistador)
// Impede que determinado horário seja usado para agendamentos
export const createBlockedSlot = async (req, res) => {
  try {
    const { data, motivo } = req.body;
    
    // Apenas o próprio entrevistador pode bloquear seu horário
    // Admin também pode bloquear para fins administrativos
    const entrevistador = req.user.id;
    const cras = req.user.cras;
    
    // Verifica se já existe bloqueio para o mesmo horário
    const exists = await BlockedSlot.findOne({ entrevistador, cras, data });
    if (exists) {
      return apiError(res, 'Horário já bloqueado');
    }
    
    // Cria novo bloqueio
    const blocked = new BlockedSlot({ entrevistador, cras, data, motivo });
    await blocked.save();
    
    // Registra ação no sistema de auditoria
    await Log.create({ 
      user: req.user.id, 
      cras, 
      action: 'bloquear_horario', 
      details: `Bloqueou o horário ${formatDateTime(data)} - Motivo: ${motivo}` 
    });
    
    apiSuccess(res, blocked, 201);
  } catch (error) {
    logger.error('Erro ao bloquear horário:', error);
    apiError(res, 'Erro ao bloquear horário');
  }
};

// Função para listar bloqueios com controle de permissões
// Entrevistadores veem apenas seus bloqueios, admin/recepção podem ver de outros
export const getBlockedSlots = async (req, res) => {
  try {
    let entrevistador, cras;
    
    // 🔒 SEGURANÇA: Define filtros baseados no perfil do usuário
    if (req.user.role === 'entrevistador') {
      // Entrevistadores veem APENAS seus próprios bloqueios
      entrevistador = req.user.id;
      cras = req.user.cras;
    } else if (req.user.role === 'recepcao') {
      // Recepção vê bloqueios APENAS do próprio CRAS
      // Ignorar completamente req.query.cras do cliente
      cras = req.user.cras;
      
      if (req.query.entrevistador) {
        // Validar que o entrevistador pertence ao CRAS da recepção
        const entrevistadorDoc = await User.findById(req.query.entrevistador).select('_id cras');
        if (!entrevistadorDoc || entrevistadorDoc.cras.toString() !== req.user.cras.toString()) {
          return apiError(res, 'Você não tem permissão para ver bloqueios de outro CRAS', 403);
        }
        entrevistador = req.query.entrevistador;
      } else {
        return apiError(res, 'Entrevistador não informado');
      }
    } else if (req.user.role === 'admin') {
      // Admin pode consultar bloqueios de qualquer entrevistador/CRAS
      entrevistador = req.query.entrevistador;
      cras = req.query.cras;
      
      if (!entrevistador) {
        return apiError(res, 'Entrevistador não informado');
      }
    }
    
    // Monta query com filtros apropriados
    const query = { entrevistador };
    if (cras) query.cras = cras;
    
    // Busca bloqueios conforme permissões
    const slots = await BlockedSlot.find(query);
    
    apiSuccess(res, slots);
  } catch (error) {
    logger.error('Erro ao buscar bloqueios:', error);
    apiError(res, 'Erro ao buscar bloqueios', 500);
  }
};

// Remover bloqueio (APENAS do próprio entrevistador ou admin)
export const deleteBlockedSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const entrevistador = req.user.id;
    
    logger.debug('Tentando deletar bloqueio', { id, role: req.user.role, userId: req.user.id });
    
    let slot;
    if (req.user.role === 'admin') {
      // Admin pode remover qualquer bloqueio
      logger.debug('Admin - Busca por CRAS', { cras: req.user.cras });
      slot = await BlockedSlot.findOne({ _id: id, cras: req.user.cras });
    } else {
      // Entrevistador APENAS pode remover seus próprios bloqueios
      logger.debug('Entrevistador - Busca por entrevistador', { entrevistador });
      slot = await BlockedSlot.findOne({ _id: id, entrevistador });
    }
    
    if (!slot) {
      logger.warn('Bloqueio não encontrado', { id, userId: req.user.id });
      return apiError(res, 'Bloqueio não encontrado', 404);
    }
    
    await BlockedSlot.deleteOne({ _id: id });
    logger.info('Bloqueio removido com sucesso', { id, userId: req.user.id });
    
    // Log automático
    await Log.create({ 
      user: req.user.id, 
      cras: slot.cras, 
      action: 'desbloquear_horario', 
      details: `Desbloqueou o horário ${formatDateTime(slot.data)}` 
    });
    
    apiMessage(res, 'Bloqueio removido');
  } catch (error) {
    logger.error('Erro ao remover bloqueio:', error);
    apiError(res, 'Erro ao remover bloqueio');
  }
};
