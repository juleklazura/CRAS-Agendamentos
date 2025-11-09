// Componente Dashboard - Página inicial do sistema CRAS Agendamentos
// Exibe boas-vindas personalizadas e informações do usuário logado
// Serve como ponto de entrada após login bem-sucedido
import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';  // Componente de navegação lateral
import { Box, Typography } from '@mui/material';

/**
 * Componente principal do dashboard
 * Página de entrada que exibe informações do usuário e orientações básicas
 * Layout centrado com informações de boas-vindas e contexto do usuário
 */
export default function Dashboard() {
  // Recupera dados do usuário logado do localStorage
  // Dados são armazenados durante o processo de login
  const user = JSON.parse(localStorage.getItem('user'));
  
  // Estado para armazenar nome completo do CRAS (obtido via API)
  // Necessário pois o user.cras pode conter apenas o ID
  const [crasNome, setCrasNome] = useState('');

  // Effect para buscar nome completo do CRAS via API
  // Melhora a experiência do usuário exibindo nome ao invés de ID
  useEffect(() => {
    async function fetchCras() {
      if (user?.cras && typeof user.cras === 'string') {
        try {
          const token = localStorage.getItem('token');
          
          // Busca dados completos do CRAS via API REST
          const response = await fetch(`http://localhost:5000/api/cras/${user.cras}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            setCrasNome(data.nome || user.cras);  // Usa nome ou fallback para ID
          } else {
            setCrasNome(user.cras);  // Fallback em caso de erro HTTP
          }
        } catch {
          setCrasNome(user.cras);  // Fallback em caso de exceção de rede
        }
      }
    }
    fetchCras();
  }, [user?.cras]);

  return (
    <>
      {/* Componente de navegação lateral */}
      <Sidebar />
      
      {/* Container principal centralizado */}
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
        {/* Título de boas-vindas personalizado */}
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
        
        {/* Informação do papel/role do usuário com tradução humanizada */}
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
        
        {/* Informação da unidade CRAS vinculada */}
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
        
        {/* Orientações para navegação */}
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
