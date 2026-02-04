# 📅 Sistema de Agendamentos CRAS

Sistema completo de gerenciamento de agendamentos para Centros de Referência de Assistência Social (CRAS), desenvolvido com React + Node.js + MongoDB.

## 🚀 Funcionalidades

### 👨‍💼 **Admin**
- Visualizar todos os agendamentos do sistema
- Gerenciar usuários e CRAS
- Visualizar logs e relatórios
- Criar agendamentos na agenda geral

### 👩‍💻 **Entrevistadores**
- Visualizar e gerenciar sua própria agenda
- Criar, editar e excluir seus agendamentos
- Confirmar presença de clientes
- Bloquear/desbloquear horários

### 🏢 **Recepção**
- Visualizar agenda de todos os entrevistadores do CRAS
- Criar e editar agendamentos para qualquer entrevistador
- Confirmar presença de clientes
- Gerenciar bloqueios de horários

## 🛠️ Tecnologias

**Frontend:**
- React 18 + Vite
- Material-UI (MUI)
- Axios
- React Router DOM
- Date-fns
- ⚡ Lazy Loading (Code Splitting)

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Bcrypt
- CORS

## 📦 Instalação

### Pré-requisitos
- Node.js 16+
- MongoDB
- Git

### 1. Clone o repositório
```bash
git clone https://github.com/juleklazura/CRAS-Agendamentos.git
cd agendamentos
```

### 2. Configurar Backend
```bash
cd backend
npm install
# Configure as variáveis de ambiente (MongoDB, JWT_SECRET)
npm start
```

### 3. Configurar Frontend
```bash
cd ../
npm install
npm run dev
```

## 🔧 Configuração

### Variáveis de Ambiente (Backend)
Crie um arquivo `.env` no diretório `backend/`:
```env
MONGODB_URI="****************"
JWT_SECRET=seu_jwt_secret_aqui
PORT=5000
```

## 🎯 Estrutura do Sistema

### **Páginas Principais:**
- `/login` - Autenticação
- `/dashboard` - Painel principal
- `/agenda` - Agenda geral (Admin visualiza, Entrevistador gerencia)
- `/minha-agenda` - Agenda pessoal do entrevistador
- `/agenda-recepcao` - Agenda da recepção
- `/agendamentos` - Lista paginada de agendamentos
- `/usuarios` - Gerenciamento de usuários
- `/cras` - Gerenciamento de CRAS
- `/logs` - Logs do sistema

## 🚦 Status de Desenvolvimento

### ✅ **Concluído:**
- Sistema de autenticação
- CRUD completo de agendamentos
- Diferentes tipos de agenda por perfil
- Edição de agendamentos (entrevistador + recepção)
- Sistema de permissões
- Interface responsiva e profissional
- Paginação otimizada
- Performance melhorada
- ⚡ **Lazy Loading implementado** (~70% redução no bundle inicial)

### 📋 **Próximas Melhorias:**
- Notificações em tempo real
- Relatórios avançados
- Exportação de dados
- Sistema de backup automático

## 📖 Documentação Técnica

- [Lazy Loading e Performance](./docs/LAZY_LOADING.md) - Detalhes sobre otimização de carregamento
