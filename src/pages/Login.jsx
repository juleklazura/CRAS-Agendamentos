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

export default function Login() {
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

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
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 400,
            borderRadius: 2,
            textAlign: 'center'
          }}
        >
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              color: '#1E4976',
              fontWeight: 'bold',
              mb: 3
            }}
          >
            CRAS Agendamentos
          </Typography>

          <Typography
            variant="body2"
            sx={{ mb: 4, color: 'text.secondary' }}
          >
            Sistema de Gerenciamento de Agendamentos
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Matrícula"
              variant="outlined"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              required
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
              sx={{
                bgcolor: '#1E4976',
                '&:hover': {
                  bgcolor: '#163558'
                }
              }}
            >
              Entrar
            </Button>
          </form>
        </Paper>

        <Typography
          variant="caption"
          sx={{ mt: 4, color: 'text.secondary' }}
        >
          © {new Date().getFullYear()} CRAS Agendamentos. Todos os direitos reservados.
        </Typography>
      </Box>
    </Container>
  );
}
