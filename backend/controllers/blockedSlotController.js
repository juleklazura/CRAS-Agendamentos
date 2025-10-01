import Log from '../models/Log.js';
import BlockedSlot from '../models/BlockedSlot.js';

// Criar bloqueio de horário (entrevistador ou recepção)
export const createBlockedSlot = async (req, res) => {
  try {
    const { data, motivo, entrevistador: entrevistadorBody } = req.body;
    // Se for recepção, pode bloquear para qualquer entrevistador
    let entrevistador = req.user.id;
    if (req.user.role === 'recepcao' && entrevistadorBody) {
      entrevistador = entrevistadorBody;
    }
    const cras = req.user.cras;
    // Não permitir bloqueio duplicado
    const exists = await BlockedSlot.findOne({ entrevistador, cras, data });
    if (exists) return res.status(400).json({ message: 'Horário já bloqueado' });
    const blocked = new BlockedSlot({ entrevistador, cras, data, motivo });
    await blocked.save();
    // Log automático
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

// Listar bloqueios do entrevistador logado ou, se admin ou recepção, de qualquer entrevistador
export const getBlockedSlots = async (req, res) => {
  try {
    let entrevistador, cras;
    
    if (req.user.role === 'admin' || req.user.role === 'recepcao') {
      entrevistador = req.query.entrevistador;
      cras = req.query.cras || req.user.cras;
      if (!entrevistador) return res.status(400).json({ message: 'Entrevistador não informado' });
    } else {
      entrevistador = req.user.id;
      cras = req.user.cras;
    }
    
    const query = { entrevistador };
    if (cras) query.cras = cras;
    
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
