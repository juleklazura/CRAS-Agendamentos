# 📅 Sistema de Agendamentos CRAS

Sistema completo de gerenciamento de agendamentos para Centros de Referência de Assistência Social (CRAS), desenvolvido com React + Node.js + PostgreSQL (Neon).

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
- Node.js 18+ + Express 5
- PostgreSQL (Neon) + Prisma 5
- JWT Authentication (httpOnly cookies)
- Bcrypt (custo 12)
- Criptografia AES-256-GCM (dados LGPD: CPF, nome, telefone)
- Helmet + CORS + Rate Limiting

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- Conta gratuita no [Neon](https://neon.tech) (PostgreSQL serverless)
- Git

### 1. Clone o repositório
```bash
git clone https://github.com/juleklazura/CRAS-Agendamentos.git
cd CRAS-Agendamentos
```

### 2. Configurar Backend
```bash
cd backend
npm install

# Copie o arquivo de exemplo e preencha com seus valores
cp .env.example .env
# Edite o .env com DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, etc.

# Gerar o cliente Prisma e aplicar o schema no banco
npx prisma generate
npx prisma db push

# Criar o usuário administrador inicial
node scripts/createAdmin.js

npm start
```

### 3. Configurar Frontend
```bash
cd ..
npm install
npm run dev
```

## 🔧 Configuração

### Variáveis de Ambiente (Backend)

Crie `backend/.env` a partir de `backend/.env.example`:

```env
# PostgreSQL Neon (obtenha em https://console.neon.tech)
DATABASE_URL=postgresql://usuario:senha@ep-xxx-pooler.neon.tech/cras?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://usuario:senha@ep-xxx.neon.tech/cras?sslmode=require

# JWT — gerar com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=<string aleatória de 128 caracteres hex>
JWT_REFRESH_SECRET=<string aleatória diferente de 128 caracteres hex>

# Criptografia LGPD — gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<string aleatória de 64 caracteres hex>

# Admin inicial (alterar a senha após o primeiro login)
ADMIN_MATRICULA=admin
ADMIN_PASSWORD=<senha forte gerada manualmente>

# Servidor
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```


## 🗄️ Banco de Dados

O projeto usa **PostgreSQL via [Neon](https://neon.tech)** (serverless, free tier disponível) gerenciado pelo **Prisma ORM**.

Os campos pessoais sensíveis (CPF, nome, telefone) são armazenados **criptografados** com AES-256-GCM (conformidade LGPD).

### Comandos úteis do Prisma
```bash
# Aplicar alterações do schema no banco
npx prisma db push

# Abrir Prisma Studio (visualizador de dados)
npx prisma studio

# Gerar cliente após alterar o schema
npx prisma generate
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
- Sistema de autenticação com JWT httpOnly cookies
- CRUD completo de agendamentos
- Diferentes tipos de agenda por perfil
- Edição de agendamentos (entrevistador + recepção)
- Sistema de permissões por role
- Criptografia de dados pessoais (LGPD)
- Interface responsiva e profissional
- Paginação otimizada
- Cache em memória
- Logs de auditoria
- Migração MongoDB → PostgreSQL (Prisma)
