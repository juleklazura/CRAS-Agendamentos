// Controller de autenticação
// Gerencia login, validação de credenciais e geração de tokens JWT
import User from '../models/User.js';
import Log from '../models/Log.js';
import bcrypt from 'bcryptjs';  // Para comparação segura de senhas
import jwt from 'jsonwebtoken';  // Para geração de tokens de autenticação
import dotenv from 'dotenv';

dotenv.config();

// Função principal de login do sistema
// Valida credenciais, gera token JWT e registra ação em log
export const login = async (req, res) => {
  const { matricula, password } = req.body;
  try {
    // Busca usuário pela matrícula única
    const user = await User.findOne({ matricula });
    if (!user) {
      return res.status(400).json({ message: 'Usuário não encontrado' });
    }
    
    // Compara senha fornecida com hash armazenado no banco
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha incorreta' });
    }
    
    // 🔒 SEGURANÇA: Valida que JWT_SECRET está configurado
    if (!process.env.JWT_SECRET) {
      console.error('ERRO CRÍTICO: JWT_SECRET não está definida no arquivo .env');
      return res.status(500).json({ message: 'Erro de configuração do servidor' });
    }
    
    // Gera token JWT com informações essenciais do usuário
    // Token expira em 8 horas para segurança
    const token = jwt.sign({ 
      id: user._id, 
      role: user.role, 
      cras: user.cras ? user.cras.toString() : null,
      agenda: user.role === 'entrevistador' ? user.agenda : undefined
    }, process.env.JWT_SECRET || 'segredo_super_secreto', { expiresIn: '8h' });
    
    // Registra login no sistema de auditoria
    await Log.create({
      user: user._id,
      cras: user.cras,
      action: 'login',
      details: `Login realizado por ${user.name} (${user.role}) - Matrícula: ${user.matricula}`
    });
    
    // Retorna token e dados básicos do usuário (sem senha)
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
