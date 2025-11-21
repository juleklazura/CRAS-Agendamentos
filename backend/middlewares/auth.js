// Middleware de autenticação e autorização
// Protege rotas que requerem usuário logado e controla permissões por role
import jwt from 'jsonwebtoken';

// Middleware principal de autenticação
// Verifica se o token JWT é válido e extrai dados do usuário
export function auth(req, res, next) {
  // 🔒 SEGURANÇA: Lê token do cookie httpOnly em vez do header
  const token = req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }
  
  try {
    // Verifica e decodifica o token usando a chave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Adiciona dados do usuário ao objeto request para uso nas rotas
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido' });
  }
}

// Middleware de autorização por roles (perfis de usuário)
// Controla acesso baseado no tipo de usuário (admin, entrevistador, recepcao)
export function authorize(roles = []) {
  return (req, res, next) => {
    // Verifica se o role do usuário está na lista de roles permitidos
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    next();
  };
}
