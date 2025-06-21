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
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          p: 3,
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 1200,
          marginLeft: '240px',
          margin: '0 auto'
        }}
      >
        <Typography 
          variant="h4" 
          gutterBottom
          sx={{ color: '#1E4976' }} // Cor azul do sidebar
        >
          Bem-vindo, {user?.name || 'Usuário'}!
        </Typography>
        <Typography 
          variant="body1" 
          paragraph
          sx={{ color: '#1E4976' }} // Cor azul do sidebar
        >
          Seu papel: <strong>{user?.role === 'admin' ? 'Administrador' : user?.role === 'entrevistador' ? 'Entrevistador' : 'Recepção'}</strong>
        </Typography>
        <Typography 
          variant="body1" 
          paragraph
          sx={{ color: '#1E4976' }} // Cor azul do sidebar
        >
          CRAS: <strong>{crasNome || user?.cras || 'N/A'}</strong>
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mt: 3 }}
        >
          Escolha uma opção no menu lateral para começar.
        </Typography>
      </Box>
    </Box>
  );
}
