import Cras from '../models/Cras.js';
import Log from '../models/Log.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

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
    
    res.status(201).json(cras);
  } catch (error) {
    logger.error('Erro ao criar CRAS:', error);
    res.status(400).json({ message: 'Erro ao criar CRAS' });
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
    res.json(crasList);
  } catch (error) {
    logger.error('Erro ao buscar CRAS:', error);
    res.status(400).json({ message: 'Erro ao buscar CRAS' });
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
      return res.status(404).json({ message: 'CRAS não encontrado' });
    }
    
    res.json(cras);
  } catch (error) {
    logger.error('Erro ao buscar CRAS:', error);
    res.status(400).json({ message: 'Erro ao buscar CRAS' });
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
      return res.status(404).json({ message: 'CRAS não encontrado' });
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
    
    res.json(cras);
  } catch (error) {
    logger.error('Erro ao atualizar CRAS:', error);
    res.status(400).json({ message: 'Erro ao atualizar CRAS' });
  }
};

// Remover CRAS
export const deleteCras = async (req, res) => {
  try {
    const { id } = req.params;
    
    const cras = await Cras.findByIdAndDelete(id);
    
    if (!cras) {
      return res.status(404).json({ message: 'CRAS não encontrado' });
    }
    
    // Registrar log
    await Log.create({
      user: req.user.id,
      action: 'excluir_cras',
      details: `CRAS excluído: ${cras.nome} - ${cras.endereco}`
    });
    
    // Invalidar cache
    cache.invalidateCras();
    
    res.json({ message: 'CRAS removido com sucesso' });
  } catch (error) {
    logger.error('Erro ao remover CRAS:', error);
    res.status(400).json({ message: 'Erro ao remover CRAS' });
  }
};