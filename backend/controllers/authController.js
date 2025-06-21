import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const login = async (req, res) => {
  const { matricula, password } = req.body;
  try {
    console.log('Tentando login para matrícula:', matricula);
    const user = await User.findOne({ matricula });
    if (!user) {
      console.log('Usuário não encontrado:', matricula);
      return res.status(400).json({ message: 'Usuário não encontrado' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Senha incorreta para matrícula:', matricula);
      return res.status(400).json({ message: 'Senha incorreta' });
    }
    console.log('JWT_SECRET disponível no controller:', process.env.JWT_SECRET);
    const token = jwt.sign({ 
      id: user._id, 
      role: user.role, 
      cras: user.cras,
      agenda: user.role === 'entrevistador' ? user.agenda : undefined
    }, process.env.JWT_SECRET || 'segredo_super_secreto', { expiresIn: '8h' });
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        role: user.role, 
        cras: user.cras, 
        matricula: user.matricula,
        agenda: user.role === 'entrevistador' ? user.agenda : undefined
      } 
    });
  } catch (_) {
    console.error('Erro no login:', err);
    res.status(500).json({ message: 'Erro no login' });
  }
};
