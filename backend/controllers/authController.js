import User from '../models/User.js';
import Log from '../models/Log.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const login = async (req, res) => {
  const { matricula, password } = req.body;
  try {
    const user = await User.findOne({ matricula });
    if (!user) {
      return res.status(400).json({ message: 'Usuário não encontrado' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha incorreta' });
    }
    const token = jwt.sign({ 
      id: user._id, 
      role: user.role, 
      cras: user.cras ? user.cras.toString() : null,
      agenda: user.role === 'entrevistador' ? user.agenda : undefined
    }, process.env.JWT_SECRET || 'segredo_super_secreto', { expiresIn: '8h' });
    
    // Criar log da ação
    await Log.create({
      user: user._id,
      cras: user.cras,
      action: 'login',
      details: `Login realizado por ${user.name} (${user.role}) - Matrícula: ${user.matricula}`
    });
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        role: user.role, 
        cras: user.cras ? user.cras.toString() : null, 
        matricula: user.matricula,
        agenda: user.role === 'entrevistador' ? user.agenda : undefined
      } 
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ message: 'Erro no login' });
  }
};
