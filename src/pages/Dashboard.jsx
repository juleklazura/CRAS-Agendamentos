// Componente Dashboard - Página inicial do sistema CRAS Agendamentos
// Exibe boas-vindas personalizadas e informações do usuário logado
// Serve como ponto de entrada após login bem-sucedido
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import Sidebar from '../components/Sidebar';  // Componente de navegação lateral
import { Box, Typography } from '@mui/material';

/**
 * Componente principal do dashboard
 * Página de entrada que exibe informações do usuário e orientações básicas
 * Layout centrado com informações de boas-vindas e contexto do usuário
 */
export default function Dashboard() {
  const { user } = useAuth();  // 🔒 SEGURANÇA: Dados do usuário via httpOnly cookies
  
  // Estado para armazenar nome completo do CRAS (obtido via API)
  // Necessário pois o user.cras pode conter apenas o ID
  const [crasNome, setCrasNome] = useState('');

  // Effect para buscar nome completo do CRAS via API
  // Melhora a experiência do usuário exibindo nome ao invés de ID
  useEffect(() => {
    async function fetchCras() {
      if (user?.cras && typeof user.cras === 'string') {
        try {
          // 🔒 SEGURANÇA: API automaticamente inclui cookie httpOnly
          const response = await api.get(`/cras/${user.cras}`);
          setCrasNome(response.data.nome || user.cras);  // Usa nome ou fallback para ID
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
