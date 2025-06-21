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
git clone [URL_DO_REPOSITORIO]
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
MONGODB_URI=mongodb://localhost:27017/agendamentos
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

### **Permissões:**
| Funcionalidade | Admin | Entrevistador | Recepção |
|---|---|---|---|
| Visualizar agenda geral | ✅ | ✅ (própria) | ❌ |
| Editar na agenda geral | ❌ | ✅ (próprios) | ❌ |
| Agenda da recepção | ❌ | ❌ | ✅ |
| Editar agendamentos (recepção) | ❌ | ❌ | ✅ |
| Gerenciar usuários | ✅ | ❌ | ❌ |
| Ver todos agendamentos | ✅ | ❌ | ❌ |

## 🎨 Características

- ✅ **Interface Responsiva** - Funciona em desktop e mobile
- ✅ **Paginação Inteligente** - Apenas onde necessário
- ✅ **Performance Otimizada** - Memoização e lazy loading
- ✅ **UX Humanizada** - Mensagens amigáveis e feedback visual
- ✅ **Segurança** - JWT + validações backend/frontend
- ✅ **Código Limpo** - ESLint + boas práticas React

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

### 📋 **Próximas Melhorias:**
- Notificações em tempo real
- Relatórios avançados
- Exportação de dados
- Sistema de backup automático

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

Desenvolvido para otimização de atendimentos em CRAS.

---

**Sistema de Agendamentos CRAS** - Facilitando o acesso aos serviços de assistência social 💙
