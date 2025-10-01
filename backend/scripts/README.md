# Scripts de Gerenciamento do Sistema CRAS

Esta pasta contém scripts utilitários para gerenciar o banco de dados e realizar operações administrativas no sistema.

## 📋 Scripts Disponíveis

### 👤 Gerenciamento de Usuários
- **`createAdminUser.js`** - Cria usuário administrador
- **`createRecepcaoUser.js`** - Cria usuário de recepção  
- **`listUsers.js`** - Lista todos os usuários do sistema
- **`verificarUsuarios.js`** - Verifica integridade dos usuários

### 📅 Gerenciamento de Agendamentos
- **`testarCriacaoAgendamento.js`** - Testa criação de agendamentos
- **`testarCriacaoAgendamentoAdmin.js`** - Testa criação como admin
- **`updateAppointments.js`** - Atualiza estrutura de agendamentos
- **`updateCreatedBy.js`** - Atualiza campo createdBy
- **`limparAgendamentos.js`** - ⚠️ Exclui TODOS os agendamentos
- **`limparAgendamentosPorEntrevistador.js`** - ⚠️ Exclui agendamentos de um entrevistador específico

### 🔧 Correções e Manutenção
- **`addMotivoField.js`** - Adiciona campo motivo aos agendamentos
- **`corrigirMotivosAgendamentos.js`** - Corrige motivos dos agendamentos
- **`verificarECorrigirMotivos.js`** - Verifica e corrige motivos
- **`verificarMotivos.js`** - Apenas verifica motivos
- **`dropEmailIndex.js`** - Remove índice de email duplicado

### 🧪 Dados de Teste
- **`createTestData.js`** - Cria dados de teste para desenvolvimento

## 🚀 Como Executar os Scripts

### Navegue até a pasta backend:
```bash
cd backend
```

### Exemplos de uso:

```bash
# Criar usuário admin
node scripts/createAdminUser.js

# Listar todos os usuários
node scripts/listUsers.js

# Limpar TODOS os agendamentos (CUIDADO!)
node scripts/limparAgendamentos.js

# Limpar agendamentos de um entrevistador específico
node scripts/limparAgendamentosPorEntrevistador.js "email@entrevistador.com"

# Criar dados de teste
node scripts/createTestData.js
```

## ⚠️ Scripts Destrutivos

**ATENÇÃO:** Os seguintes scripts fazem alterações IRREVERSÍVEIS no banco de dados:

- `limparAgendamentos.js` - Exclui TODOS os agendamentos do sistema
- `limparAgendamentosPorEntrevistador.js` - Exclui todos os agendamentos de um entrevistador

**Use com extremo cuidado e sempre faça backup antes!**

## � Logs

Todos os scripts destrutivos registram suas ações no sistema de logs para auditoria.

## 🔍 Troubleshooting

Se um script falhar:
1. Verifique se o MongoDB está rodando
2. Confirme as variáveis de ambiente no `.env`
3. Verifique se você está na pasta `backend`
4. Consulte as mensagens de erro detalhadas
