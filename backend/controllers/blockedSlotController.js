import logger from '../utils/logger.js';
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
      return res.status(400).json({ message: 'Horário já bloqueado' });
    }
    
    // Cria novo bloqueio
    const blocked = new BlockedSlot({ entrevistador, cras, data, motivo });
    await blocked.save();
    
    // Registra ação no sistema de auditoria
    await Log.create({ 
      user: req.user.id, 
      cras, 
      action: 'bloquear_horario', 
      details: `Bloqueou o horário ${new Date(data).toLocaleString('pt-BR')} - Motivo: ${motivo}` 
    });
    
    res.status(201).json(blocked);
  } catch (error) {
    logger.error('Erro ao bloquear horário:', error);
    res.status(400).json({ message: 'Erro ao bloquear horário', error: error.message });
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
        const entrevistadorDoc = await User.findById(req.query.entrevistador);
        if (!entrevistadorDoc || entrevistadorDoc.cras.toString() !== req.user.cras.toString()) {
          return res.status(403).json({ message: 'Você não tem permissão para ver bloqueios de outro CRAS' });
        }
        entrevistador = req.query.entrevistador;
      } else {
        return res.status(400).json({ message: 'Entrevistador não informado' });
      }
    } else if (req.user.role === 'admin') {
      // Admin pode consultar bloqueios de qualquer entrevistador/CRAS
      entrevistador = req.query.entrevistador;
      cras = req.query.cras;
      
      if (!entrevistador) {
        return res.status(400).json({ message: 'Entrevistador não informado' });
      }
    }
    
    // Monta query com filtros apropriados
    const query = { entrevistador };
    if (cras) query.cras = cras;
    
    // Busca bloqueios conforme permissões
    const slots = await BlockedSlot.find(query);
    
    res.json(slots);
  } catch (error) {
    logger.error('Erro ao buscar bloqueios:', error);
    res.status(500).json({ message: 'Erro ao buscar bloqueios' });
  }
};

// Remover bloqueio (APENAS do próprio entrevistador ou admin)
export const deleteBlockedSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const entrevistador = req.user.id;
    
    console.log('Tentando deletar bloqueio:', id);
    console.log('Usuário:', req.user.role, req.user.id);
    console.log('CRAS do usuário:', req.user.cras);
    
    let slot;
    if (req.user.role === 'admin') {
      // Admin pode remover qualquer bloqueio
      console.log('Admin - Busca por CRAS:', req.user.cras);
      slot = await BlockedSlot.findOne({ _id: id, cras: req.user.cras });
    } else {
      // Entrevistador APENAS pode remover seus próprios bloqueios
      console.log('Entrevistador - Busca por entrevistador:', entrevistador);
      slot = await BlockedSlot.findOne({ _id: id, entrevistador });
    }
    
    console.log('Slot encontrado:', slot);
    
    if (!slot) {
      console.log('Bloqueio não encontrado para ID:', id);
      return res.status(404).json({ message: 'Bloqueio não encontrado' });
    }
    
    await BlockedSlot.deleteOne({ _id: id });
    console.log('Bloqueio removido com sucesso');
    
    // Log automático
    await Log.create({ 
      user: req.user.id, 
      cras: slot.cras, 
      action: 'desbloquear_horario', 
      details: `Desbloqueou o horário ${new Date(slot.data).toLocaleString('pt-BR')}` 
    });
    
    res.json({ message: 'Bloqueio removido' });
  } catch (error) {
    logger.error('Erro ao remover bloqueio:', error);
    res.status(400).json({ message: 'Erro ao remover bloqueio' });
  }
};
