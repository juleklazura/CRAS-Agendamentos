import logger from '../utils/logger.js';
import cache from '../utils/cache.js';
// Controller para gerenciamento de usuários
// Controla criação, edição, listagem e exclusão de usuários do sistema
import User from '../models/User.js';
import Log from '../models/Log.js';
import bcrypt from 'bcryptjs';  // Para hash seguro de senhas

// Função para criar novo usuário (apenas administradores)
// Valida dados, gera hash da senha e registra ação em log
export const createUser = async (req, res) => {
  try {
    const { name, password, role, cras, matricula } = req.body;
    
    // 🔒 SEGURANÇA: Validar campos obrigatórios
    if (!name || !password || !role || !matricula) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios: name, password, role, matricula' });
    }
    
    // 🔒 SEGURANÇA: Whitelist de roles permitidos
    const allowedRoles = ['admin', 'entrevistador', 'recepcao'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Role inválido. Valores permitidos: admin, entrevistador, recepcao' });
    }
    
    // 🔒 SEGURANÇA: Validar força da senha
    if (password.length < 8) {
      return res.status(400).json({ message: 'Senha deve ter pelo menos 8 caracteres' });
    }
    
    // Validação: Admin não deve ter CRAS
    if (role === 'admin' && cras) {
      return res.status(400).json({ message: 'Administradores não devem ter CRAS associado' });
    }
    
    // Validação: Entrevistador e Recepção devem ter CRAS
    if ((role === 'entrevistador' || role === 'recepcao') && !cras) {
      return res.status(400).json({ message: 'CRAS é obrigatório para entrevistadores e recepção' });
    }
    
    // Gera hash seguro da senha antes de armazenar (custo 12 para maior segurança)
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Cria novo usuário com dados validados (remove cras se for admin)
    const userData = { name, password: hashedPassword, role, matricula };
    if (role !== 'admin') {
      userData.cras = cras;
    }
    const user = new User(userData);
    await user.save();
    
    // Registra criação do usuário no sistema de auditoria
    await Log.create({
      user: req.user.id,
      cras: req.user.cras,
      action: 'criar_usuario',
      details: `Usuário criado: ${name} (${role}) - Matrícula: ${matricula || 'N/A'}`
    });
    
    // Invalidar cache de usuários após criação
    cache.invalidateUsers();
    
    res.status(201).json(user);
  } catch (err) {
    logger.error('Erro ao criar usuário:', err);
    res.status(400).json({ message: 'Erro ao criar usuário' });
  }
};

// Função para listar usuários com controle de permissões
// Administradores veem todos, outros perfis veem apenas entrevistadores
export const getUsers = async (req, res) => {
  try {
    // Gerar chave de cache baseada no role do usuário
    const cacheKey = `users:all:role:${req.user.role}`;
    
    // Função que executa a query (será chamada se cache miss)
    const fetchUsers = async () => {
      let query = {};
      
      // Controle de acesso: recepção e entrevistadores só veem entrevistadores
      if (req.user.role !== 'admin') {
        query.role = 'entrevistador';
      }
      
      // Busca usuários excluindo senha e populando dados do CRAS
      const users = await User.find(query).select('-password').populate('cras');
      return users;
    };
    
    // Usar cache com TTL de 5 minutos (padrão)
    const users = await cache.cached(cacheKey, fetchUsers);
    
    res.json(users);
  } catch (error) {
    logger.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
};

// Função para listar apenas entrevistadores (para todos os usuários autenticados)
// Usada para popular seletores de entrevistador em formulários
export const getEntrevistadores = async (req, res) => {
  try {
    const cacheKey = 'users:entrevistadores';
    
    const fetchEntrevistadores = async () => {
      const users = await User.find({ role: 'entrevistador' }).select('-password');
      return users;
    };
    
    const users = await cache.cached(cacheKey, fetchEntrevistadores);
    res.json(users);
  } catch (_) {
    res.status(500).json({ message: 'Erro ao buscar entrevistadores' });
  }
};

// Função para buscar entrevistadores por CRAS específico
// Utilizada pela recepção para filtrar entrevistadores do próprio CRAS
export const getEntrevistadoresByCras = async (req, res) => {
  try {
    const { crasId } = req.params;
    const cacheKey = `users:entrevistadores:cras:${crasId}`;
    
    const fetchEntrevistadores = async () => {
      // Busca apenas entrevistadores do CRAS especificado
      const entrevistadores = await User.find({
        role: 'entrevistador',
        cras: crasId
      }).select('-password').populate('cras');
      return entrevistadores;
    };
    
    const entrevistadores = await cache.cached(cacheKey, fetchEntrevistadores);
    
    res.json(entrevistadores);
  } catch (error) {
    logger.error('Erro ao buscar entrevistadores:', error);
    res.status(500).json({ message: 'Erro ao buscar entrevistadores' });
  }
};

// Editar usuário (admin)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password, role, cras, matricula, agenda } = req.body;
    
    // 🔒 SEGURANÇA: Whitelist de roles permitidos
    if (role) {
      const allowedRoles = ['admin', 'entrevistador', 'recepcao'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'Role inválido. Valores permitidos: admin, entrevistador, recepcao' });
      }
    }
    
    // 🔒 SEGURANÇA: Validar força da senha (se fornecida)
    if (password && password.length < 8) {
      return res.status(400).json({ message: 'Senha deve ter pelo menos 8 caracteres' });
    }
    
    // Validação: Admin não deve ter CRAS
    if (role === 'admin' && cras) {
      return res.status(400).json({ message: 'Administradores não devem ter CRAS associado' });
    }
    
    // Validação: Entrevistador e Recepção devem ter CRAS
    if ((role === 'entrevistador' || role === 'recepcao') && !cras) {
      return res.status(400).json({ message: 'CRAS é obrigatório para entrevistadores e recepção' });
    }
    
    const update = { name, role, matricula };
    // Remove CRAS se for admin, adiciona se for outro perfil
    if (role === 'admin') {
      update.cras = null;
    } else {
      update.cras = cras;
    }
    // 🔒 SEGURANÇA: Hash com custo 12 para maior segurança
    if (password) update.password = await bcrypt.hash(password, 12);
    if (role === 'entrevistador' && agenda) {
      update.agenda = {
        horariosDisponiveis: agenda.horariosDisponiveis || [
          '08:30', '09:00', '09:30', '10:00', '10:30',
          '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
          '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
        ],
        diasAtendimento: agenda.diasAtendimento || [1, 2, 3, 4, 5]
      };
    }
    const user = await User.findByIdAndUpdate(id, update, { new: true });
    
    // Criar log da ação
    await Log.create({
      user: req.user.id,
      cras: req.user.cras,
      action: 'editar_usuario',
      details: `Usuário editado: ${user.name} (${user.role}) - Matrícula: ${user.matricula || 'N/A'}`
    });
    
    // Invalidar cache após edição
    cache.invalidateUsers();
    
    res.json(user);
  } catch (_) {
    res.status(400).json({ message: 'Erro ao atualizar usuário' });
  }
};

// Remover usuário (admin)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar dados do usuário antes de excluir para o log
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    await User.findByIdAndDelete(id);
    
    // Criar log da ação
    await Log.create({
      user: req.user.id,
      cras: req.user.cras,
      action: 'excluir_usuario',
      details: `Usuário excluído: ${user.name} (${user.role}) - Matrícula: ${user.matricula || 'N/A'}`
    });
    
    // Invalidar cache após exclusão
    cache.invalidateUsers();
    
    res.json({ message: 'Usuário removido' });
  } catch (_) {
    res.status(400).json({ message: 'Erro ao remover usuário' });
  }
};
