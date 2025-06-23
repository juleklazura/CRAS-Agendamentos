import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Box, Typography } from '@mui/material';

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user'));
  const [crasNome, setCrasNome] = useState('');

  useEffect(() => {
    async function fetchCras() {
      if (user?.cras && typeof user.cras === 'string') {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`http://localhost:5000/api/cras/${user.cras}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setCrasNome(data.nome || user.cras);
          } else {
            setCrasNome(user.cras);
          }
        } catch {
          setCrasNome(user.cras);
        }
      }
    }
    fetchCras();
  }, [user?.cras]);

  return (
    <>
      <Sidebar />
      <Box 
        component="main" 
        className="main-content"
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}
      >
        <Typography 
          variant="h4" 
          gutterBottom
          sx={{ 
            color: '#1E4976',
            textAlign: 'center',
            mb: 3
          }}
        >
          Bem-vindo, {user?.name || 'Usuário'}!
        </Typography>
        <Typography 
          variant="body1" 
          paragraph
          sx={{ 
            color: '#1E4976',
            textAlign: 'center',
            mb: 2
          }}
        >
          Seu papel: <strong>{user?.role === 'admin' ? 'Administrador' : user?.role === 'entrevistador' ? 'Entrevistador' : 'Recepção'}</strong>
        </Typography>
        <Typography 
          variant="body1" 
          paragraph
          sx={{ 
            color: '#1E4976',
            textAlign: 'center',
            mb: 3
          }}
        >
          CRAS: <strong>{crasNome || user?.cras || 'N/A'}</strong>
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mt: 3,
            textAlign: 'center'
          }}
        >
          Escolha uma opção no menu lateral para começar.
        </Typography>
      </Box>
    </>
  );
}
