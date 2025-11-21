import logger from '../utils/logger.js';
// Controller para gerenciamento de unidades CRAS
// Controla operações CRUD para as unidades do Centro de Referência de Assistência Social
import Cras from '../models/Cras.js';
import Log from '../models/Log.js';

// Função para criar nova unidade CRAS (apenas administradores)
// Registra criação no sistema de auditoria
export const createCras = async (req, res) => {
  try {
    const { nome, endereco, telefone } = req.body;
    
    // Cria nova unidade CRAS
    const cras = new Cras({ nome, endereco, telefone });
    await cras.save();
    
    // Registra criação no log de auditoria
    await Log.create({
      user: req.user.id,
      cras: cras._id,
      action: 'criar_cras',
      details: `CRAS criado: ${nome} - ${endereco}`
    });
    
    res.status(201).json(cras);
  } catch (_) {
    res.status(400).json({ message: 'Erro ao criar CRAS' });
  }
};

// Função para listar todas as unidades CRAS
// Acessível para todos os usuários autenticados
export const getCras = async (req, res) => {
  try {
    const cras = await Cras.find();
    res.json(cras);
  } catch (_) {
    res.status(500).json({ message: 'Erro ao buscar CRAS' });
  }
};

// Função para buscar unidade CRAS específica por ID
export const getCrasById = async (req, res) => {
  try {
    const { id } = req.params;
    const cras = await Cras.findById(id);
    
    if (!cras) {
      return res.status(404).json({ message: 'CRAS não encontrado' });
    }
    
    res.json(cras);
  } catch (_) {
    res.status(500).json({ message: 'Erro ao buscar CRAS' });
  }
};

export const updateCras = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, endereco, telefone } = req.body;
    const cras = await Cras.findByIdAndUpdate(id, { nome, endereco, telefone }, { new: true });
    
    // Criar log da ação
    await Log.create({
      user: req.user.id,
      cras: cras._id,
      action: 'editar_cras',
      details: `CRAS editado: ${cras.nome} - ${cras.endereco}`
    });
    
    res.json(cras);
  } catch (_) {
    res.status(400).json({ message: 'Erro ao atualizar CRAS' });
  }
};

export const deleteCras = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar dados do CRAS antes de excluir para o log
    const cras = await Cras.findById(id);
    if (!cras) {
      return res.status(404).json({ message: 'CRAS não encontrado' });
    }
    
    await Cras.findByIdAndDelete(id);
    
    // Criar log da ação
    await Log.create({
      user: req.user.id,
      cras: cras._id,
      action: 'excluir_cras',
      details: `CRAS excluído: ${cras.nome} - ${cras.endereco}`
    });
    
    res.json({ message: 'CRAS removido' });
  } catch (_) {
    res.status(400).json({ message: 'Erro ao remover CRAS' });
  }
};
