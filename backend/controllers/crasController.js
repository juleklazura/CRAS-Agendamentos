import Cras from '../models/Cras.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import BlockedSlot from '../models/BlockedSlot.js';
import Log from '../models/Log.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { apiSuccess, apiMessage, apiError } from '../utils/apiResponse.js';

// =============================================================================
// 📋 GERENCIAMENTO DE UNIDADES CRAS
// =============================================================================

// Criar novo CRAS (apenas admin)
export const createCras = async (req, res) => {
  try {
    const { nome, endereco, telefone } = req.body;
    
    const cras = new Cras({ nome, endereco, telefone });
    await cras.save();
    
    // Registrar log
    await Log.create({
      user: req.user.id,
      cras: cras._id,
      action: 'criar_cras',
      details: `CRAS criado: ${nome} - ${endereco}`
    });
    
    // Invalidar cache
    cache.invalidateCras();
    
    apiSuccess(res, cras, 201);
  } catch (error) {
    logger.error('Erro ao criar CRAS:', error);
    apiError(res, 'Erro ao criar CRAS');
  }
};

// Listar todos os CRAS
export const getCras = async (req, res) => {
  try {
    const cacheKey = 'cras:all';
    
    const fetchCras = async () => {
      return await Cras.find().sort({ nome: 1 });
    };
    
    const crasList = await cache.cached(cacheKey, fetchCras, 300);
    apiSuccess(res, crasList);
  } catch (error) {
    logger.error('Erro ao buscar CRAS:', error);
    apiError(res, 'Erro ao buscar CRAS', 500);
  }
};

// Buscar CRAS por ID
export const getCrasById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `cras:${id}`;
    
    const fetchCras = async () => {
      return await Cras.findById(id);
    };
    
    const cras = await cache.cached(cacheKey, fetchCras, 300);
    
    if (!cras) {
      return apiError(res, 'CRAS não encontrado', 404);
    }
    
    apiSuccess(res, cras);
  } catch (error) {
    logger.error('Erro ao buscar CRAS:', error);
    apiError(res, 'Erro ao buscar CRAS', 500);
  }
};

// Atualizar CRAS
export const updateCras = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, endereco, telefone } = req.body;
    
    const cras = await Cras.findByIdAndUpdate(
      id, 
      { nome, endereco, telefone }, 
      { new: true }
    );
    
    if (!cras) {
      return apiError(res, 'CRAS não encontrado', 404);
    }
    
    // Registrar log
    await Log.create({
      user: req.user.id,
      cras: cras._id,
      action: 'editar_cras',
      details: `CRAS editado: ${cras.nome} - ${cras.endereco}`
    });
    
    // Invalidar cache
    cache.invalidateCras();
    
    apiSuccess(res, cras);
  } catch (error) {
    logger.error('Erro ao atualizar CRAS:', error);
    apiError(res, 'Erro ao atualizar CRAS');
  }
};

// Remover CRAS
export const deleteCras = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 🔒 SEGURANÇA: Verificar se o CRAS existe antes de tudo
    const cras = await Cras.findById(id);
    if (!cras) {
      return apiError(res, 'CRAS não encontrado', 404);
    }
    
    // 🔒 VERIFICAÇÃO DE DEPENDÊNCIAS: Não permitir exclusão se houver dados vinculados
    const [usuariosVinculados, agendamentosAtivos, bloqueiosAtivos] = await Promise.all([
      User.countDocuments({ cras: id }),
      Appointment.countDocuments({ cras: id, status: { $in: ['agendado', 'reagendar'] } }),
      BlockedSlot.countDocuments({ cras: id })
    ]);
    
    const dependencias = [];
    if (usuariosVinculados > 0) {
      dependencias.push(`${usuariosVinculados} usuário(s) vinculado(s)`);
    }
    if (agendamentosAtivos > 0) {
      dependencias.push(`${agendamentosAtivos} agendamento(s) ativo(s)`);
    }
    if (bloqueiosAtivos > 0) {
      dependencias.push(`${bloqueiosAtivos} bloqueio(s) de horário`);
    }
    
    if (dependencias.length > 0) {
      return apiError(res, `Não é possível excluir o CRAS "${cras.nome}". Existem: ${dependencias.join(', ')}. Remova as dependências antes de excluir.`, 409, {
        code: 'CRAS_HAS_DEPENDENCIES',
        dependencias: {
          usuarios: usuariosVinculados,
          agendamentos: agendamentosAtivos,
          bloqueios: bloqueiosAtivos
        }
      });
    }
    
    await Cras.findByIdAndDelete(id);
    
    // Registrar log
    await Log.create({
      user: req.user.id,
      action: 'excluir_cras',
      details: `CRAS excluído: ${cras.nome} - ${cras.endereco}`
    });
    
    // Invalidar cache
    cache.invalidateCras();
    
    apiMessage(res, 'CRAS removido com sucesso');
  } catch (error) {
    logger.error('Erro ao remover CRAS:', error);
    apiError(res, 'Erro ao remover CRAS');
  }
};