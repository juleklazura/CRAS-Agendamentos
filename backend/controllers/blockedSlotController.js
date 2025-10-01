// Controller para gerenciamento de bloqueios de horário
// Permite que entrevistadores bloqueiem horários específicos em suas agendas
import Log from '../models/Log.js';
import BlockedSlot from '../models/BlockedSlot.js';

// Função para criar bloqueio de horário (entrevistador ou recepção)
// Impede que determinado horário seja usado para agendamentos
export const createBlockedSlot = async (req, res) => {
  try {
    const { data, motivo, entrevistador: entrevistadorBody } = req.body;
    
    // Determina quem será o entrevistador do bloqueio
    // Recepção pode bloquear para qualquer entrevistador, outros apenas para si
    let entrevistador = req.user.id;
    if (req.user.role === 'recepcao' && entrevistadorBody) {
      entrevistador = entrevistadorBody;
    }
    
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
  } catch (_) {
    res.status(400).json({ message: 'Erro ao bloquear horário' });
  }
};

// Função para listar bloqueios com controle de permissões
// Entrevistadores veem apenas seus bloqueios, admin/recepção podem ver de outros
export const getBlockedSlots = async (req, res) => {
  try {
    let entrevistador, cras;
    
    // Define filtros baseados no perfil do usuário
    if (req.user.role === 'admin' || req.user.role === 'recepcao') {
      // Admin e recepção podem consultar bloqueios de outros entrevistadores
      entrevistador = req.query.entrevistador;
      cras = req.query.cras || req.user.cras;
      
      if (!entrevistador) {
        return res.status(400).json({ message: 'Entrevistador não informado' });
      }
    } else {
      // Entrevistadores veem apenas seus próprios bloqueios
      entrevistador = req.user.id;
      cras = req.user.cras;
    }
    
    // Monta query com filtros apropriados
    const query = { entrevistador };
    if (cras) query.cras = cras;
    
    // Busca bloqueios conforme permissões
    const slots = await BlockedSlot.find(query);
    
    res.json(slots);
  } catch (error) {
    console.error('Erro ao buscar bloqueios:', error);
    res.status(500).json({ message: 'Erro ao buscar bloqueios' });
  }
};

// Remover bloqueio (apenas do próprio usuário ou recepção/admin)
export const deleteBlockedSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const entrevistador = req.user.id;
    
    console.log('Tentando deletar bloqueio:', id);
    console.log('Usuário:', req.user.role, req.user.id);
    console.log('CRAS do usuário:', req.user.cras);
    
    let slot;
    if (req.user.role === 'recepcao' || req.user.role === 'admin') {
      // Recepção e admin podem remover qualquer bloqueio do mesmo CRAS
      console.log('Busca por CRAS:', req.user.cras);
      slot = await BlockedSlot.findOne({ _id: id, cras: req.user.cras });
    } else {
      // Entrevistador só pode remover seus próprios bloqueios
      console.log('Busca por entrevistador:', entrevistador);
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
    console.error('Erro ao remover bloqueio:', error);
    res.status(400).json({ message: 'Erro ao remover bloqueio' });
  }
};
