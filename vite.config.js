// Configuração do Vite para build otimizado e desenvolvimento
// Define plugins, otimizações de bundle, separação de chunks e proxy para API
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração principal do Vite
export default defineConfig({
  // Plugins necessários para desenvolvimento
  plugins: [react()],  // Plugin oficial do React para Vite
  
  // Servidor de desenvolvimento
  server: {
    port: 5173,
    // Proxy para API em desenvolvimento (redireciona /api para backend local)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  
  // Configurações de build para produção
  build: {
    // Aumenta limite de aviso para chunks grandes
    chunkSizeWarningLimit: 1500,
    
    // Configurações do Rollup para otimização do bundle
    rollupOptions: {
      output: {
        // Separação manual de chunks para melhor cache e carregamento
        manualChunks: {
          // Separa Material-UI e Emotion em chunk próprio (bibliotecas grandes)
          'mui': ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers', '@emotion/react', '@emotion/styled'],
          
          // Separa React em chunk próprio (core framework)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Separa bibliotecas utilitárias em chunk separado
          'utils': ['axios', 'date-fns']
        }
      }
    }
  }
})
