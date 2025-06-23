import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa Material-UI e Emotion em chunk próprio
          'mui': ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers', '@emotion/react', '@emotion/styled'],
          // Separa React em chunk próprio
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Separa bibliotecas utilitárias
          'utils': ['axios', 'date-fns']
        }
      }
    }
  }
})
