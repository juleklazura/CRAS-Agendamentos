// Configuração do ESLint para o projeto CRAS Agendamentos
// Define regras de qualidade de código para frontend React
// Configuração moderna usando flat config (ESLint 9+)
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // Arquivos e pastas ignorados pelo linter
  // backend/**: ignora código do servidor Node.js (tem seu próprio linting)
  // api/**: ignora serverless functions do Vercel (Node.js)
  // dist/**: ignora arquivos de build do Vite
  { ignores: ['dist', 'backend/**', 'api/**', 'node_modules/**'] },
  {
    // Aplica configuração para arquivos JavaScript e JSX do frontend
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser, // Define globals do browser (window, document, etc.)
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true }, // Habilita parsing de JSX
        sourceType: 'module', // Habilita ES modules (import/export)
      },
    },
    plugins: {
      // Plugin para regras dos hooks do React
      'react-hooks': reactHooks,
      // Plugin para hot reload do Vite/React
      'react-refresh': reactRefresh,
    },
    rules: {
      // Regras base recomendadas do JavaScript
      ...js.configs.recommended.rules,
      // Regras recomendadas para hooks do React
      ...reactHooks.configs.recommended.rules,
      // Permite variáveis não usadas se começarem com maiúscula (constantes)
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Avisa quando componentes não são compatíveis com hot reload
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
