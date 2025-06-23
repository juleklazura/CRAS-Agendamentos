import React, { useState } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Container
} from '@mui/material';
import logo from '../assets/logo-faspg.svg';

export default function Login() {
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      const resposta = await axios.post('http://localhost:5000/api/auth/login', {
        matricula,
        password: senha
      });

      localStorage.setItem('token', resposta.data.token);
      localStorage.setItem('user', JSON.stringify(resposta.data.user));
      window.location.href = '/dashboard';
    } catch (erro) {
      setErro(erro.response?.data?.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
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
              p: 1,
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
          <img
            src={logo}
            alt="FASPG Logo"
            style={{
              width: '100%',
              height: 'auto',
              marginBottom: '8px'
            }}
          />

          <Box sx={{ px: 3, pb: 3 }}>
            <Typography
              variant="body2"
              sx={{ mb: 3, color: 'black' }}
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
                'aria-describedby': 'matricula-help'
              }}
              sx={{ mb: 2 }}
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
                'aria-describedby': 'senha-help'
              }}
              sx={{ mb: 3 }}
            />

            {erro && (
              <Alert 
                severity="error" 
                sx={{ mb: 2 }}
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
                '&:hover': {
                  bgcolor: '#163558'
                },
                '&:disabled': {
                  bgcolor: '#93a3b0'
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
