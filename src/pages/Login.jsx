// Componente de Login do Sistema CRAS
// Interface de autenticação com validação e feedback visual
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

// Componentes de interface do Material-UI
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Container
} from '@mui/material';

// Logo oficial da FASPG
import logo from '../assets/logo-anim.gif';

// Componente principal de login
export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  
  // Estados para controle do formulário
  const [matricula, setMatricula] = useState('');    // Matrícula do usuário
  const [senha, setSenha] = useState('');            // Senha do usuário
  const [erro, setErro] = useState('');              // Mensagens de erro
  const [loading, setLoading] = useState(false);     // Estado de carregamento

  // Função principal de autenticação
  // Valida credenciais e redireciona em caso de sucesso
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');      // Limpa erros anteriores
    setLoading(true); // Ativa indicador de carregamento

    try {
      // 🔒 SEGURANÇA: Login agora usa httpOnly cookies
      const result = await login(matricula, senha);
      
      if (result.success) {
        // Redireciona para o dashboard após login bem-sucedido
        navigate('/dashboard');
      } else {
        setErro(result.message);
      }
    } catch {
      // Exibe erro específico ou mensagem genérica
      setErro('Erro ao fazer login. Tente novamente.');
    } finally {
      // Sempre desativa o loading, independente do resultado
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Container>
        <Box>
          <Paper
            elevation={3}
            sx={{
              p: { xs: 2, sm: 1 },
              borderRadius: { xs: 3, sm: 2 },
              textAlign: 'center',
              mx: { xs: 1, sm: 0 }
            }}
          >
          <img
            src={logo}
            alt="FASPG Logo"
            style={{
              width: '100%',
              maxWidth: '280px',
              height: 'auto',
              marginBottom: '8px'
            }}
          />

          <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
            <Typography
              variant="body2"
              sx={{ 
                mb: { xs: 2, sm: 3 }, 
                color: 'black',
                fontSize: { xs: '0.85rem', sm: '0.875rem' }
              }}
            >
              Sistema de Gerenciamento de Agendamentos para Cadastro Único
            </Typography>

            <form onSubmit={handleSubmit} aria-label="Formulário de login">
            <TextField
              fullWidth
              label="Matrícula"
              variant="outlined"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              required
              autoComplete="username"
              inputProps={{
                'aria-describedby': 'matricula-help',
                style: { fontSize: '16px' } // Previne zoom no iOS
              }}
              sx={{ 
                mb: 2,
                '& .MuiInputBase-root': {
                  minHeight: { xs: 52, sm: 48 }
                }
              }}
            />

            <TextField
              fullWidth
              type="password"
              label="Senha"
              variant="outlined"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              inputProps={{
                'aria-describedby': 'senha-help',
                style: { fontSize: '16px' } // Previne zoom no iOS
              }}
              sx={{ 
                mb: 3,
                '& .MuiInputBase-root': {
                  minHeight: { xs: 52, sm: 48 }
                }
              }}
            />

            {erro && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  borderRadius: { xs: 2, sm: 1 }
                }}
              >
                {erro}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                bgcolor: '#1E4976',
                minHeight: { xs: 52, sm: 48 },
                fontSize: { xs: '1rem', sm: '0.95rem' },
                fontWeight: 600,
                borderRadius: { xs: 2, sm: 1 },
                '&:hover': {
                  bgcolor: '#163558'
                },
                '&:disabled': {
                  bgcolor: '#93a3b0'
                },
                '&:active': {
                  transform: 'scale(0.98)'
                }
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          </Box>
        </Paper>
      </Box>
    </Container>
    </div>
  );
}
