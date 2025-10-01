import User from '../models/User.js';
import Log from '../models/Log.js';
import bcrypt from 'bcryptjs';

// Criar usuário (apenas admin)
export const createUser = async (req, res) => {
  try {
    const { name, password, role, cras, matricula } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, password: hashedPassword, role, cras, matricula });
    await user.save();
    
    // Criar log da ação
    await Log.create({
      user: req.user.id,
      cras: req.user.cras,
      action: 'criar_usuario',
      details: `Usuário criado: ${name} (${role}) - Matrícula: ${matricula || 'N/A'}`
    });
    
    res.status(201).json(user);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(400).json({ message: 'Erro ao criar usuário', error: err.message });
  }
};

// Listar usuários (admin)
export const getUsers = async (req, res) => {
  try {
    let query = {};
    // Se for recepção ou entrevistador, filtra apenas entrevistadores
    if (req.user.role !== 'admin') {
      query.role = 'entrevistador';
    }
    const users = await User.find(query).select('-password').populate('cras');
    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ message: 'Erro ao buscar usuários' });
  }
};

// Listar entrevistadores (todos os usuários autenticados)
export const getEntrevistadores = async (req, res) => {
  try {
    const users = await User.find({ role: 'entrevistador' }).select('-password');
    res.json(users);
  } catch (_) {
    res.status(500).json({ message: 'Erro ao buscar entrevistadores' });
  }
};

// Buscar entrevistadores por CRAS (para recepção)
export const getEntrevistadoresByCras = async (req, res) => {
  try {
    const { crasId } = req.params;
    
    const entrevistadores = await User.find({
      role: 'entrevistador',
      cras: crasId
    }).select('-password').populate('cras');
    
    res.json(entrevistadores);
  } catch (error) {
    console.error('Erro ao buscar entrevistadores:', error);
    res.status(500).json({ message: 'Erro ao buscar entrevistadores' });
  }
};

// Editar usuário (admin)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password, role, cras, matricula, agenda } = req.body;
    const update = { name, role, cras, matricula };
    if (password) update.password = await bcrypt.hash(password, 10);
    if (role === 'entrevistador' && agenda) {
      update.agenda = {
        horariosDisponiveis: agenda.horariosDisponiveis || [
          '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
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
    
    res.json({ message: 'Usuário removido' });
  } catch (_) {
    res.status(400).json({ message: 'Erro ao remover usuário' });
  }
};
