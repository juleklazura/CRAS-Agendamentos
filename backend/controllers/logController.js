// Controller para sistema de logs e auditoria
// Gerencia registro e consulta de ações dos usuários no sistema
import Log from '../models/Log.js';

// Função para criar novo registro de log
// Usada quando usuários realizam ações que precisam ser auditadas
export const createLog = async (req, res) => {
  try {
    const { action, details, cras } = req.body;
    
    // Cria novo log associado ao usuário autenticado
    const log = new Log({ user: req.user.id, cras, action, details });
    await log.save();
    
    res.status(201).json(log);
  } catch (_) {
    res.status(400).json({ message: 'Erro ao criar log' });
  }
};

// Função para consultar logs com filtros por perfil de usuário
// Entrevistadores veem apenas seus logs, recepção vê logs do CRAS, admin vê todos
export const getLogs = async (req, res) => {
  try {
    const filter = {};
    
    // Aplica filtros baseados no perfil do usuário
    if (req.user.role === 'entrevistador') {
      // Entrevistador vê apenas seus próprios logs
      filter.user = req.user.id;
    } else if (req.user.role === 'recepcao') {
      // Recepção vê logs do próprio CRAS
      filter.cras = req.user.cras;
    } else if (req.query.cras) {
      // Admin pode filtrar por CRAS específico
      filter.cras = req.query.cras;
    }
    
    // Busca logs com dados populados e ordenação por data decrescente
    const logs = await Log.find(filter)
      .populate('user cras')
      .sort({ date: -1 }); // Mais recente primeiro
      
    res.json(logs);
  } catch (_) {
    res.status(500).json({ message: 'Erro ao buscar logs' });
  }
};
