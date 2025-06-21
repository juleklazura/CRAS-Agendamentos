# Scripts do Backend

Este diretório contém scripts utilitários para o sistema de agendamentos.

## 📁 Estrutura dos Scripts

### ✅ **Scripts de Produção/Migração** (incluídos no Git)
Scripts seguros que podem ser executados em produção:

- `createAdminUser.js` - Cria usuário administrador
- `createRecepcaoUser.js` - Cria usuário de recepção
- `listUsers.js` - Lista usuários do sistema
- `verificarUsuarios.js` - Verifica integridade dos usuários
- `addMotivoField.js` - Migração: adiciona campo motivo
- `dropEmailIndex.js` - Migração: remove índice de email
- `updateAppointments.js` - Migração: atualiza agendamentos
- `updateCreatedBy.js` - Migração: atualiza campo createdBy

### ⚠️ **Scripts de Desenvolvimento/Teste** (excluídos do Git)
Scripts perigosos que podem apagar dados - **APENAS PARA DESENVOLVIMENTO**:

- `createTestUsers.js` - ❌ Cria usuários de teste
- `deleteAllAppointments.js` - ❌ **PERIGO**: Apaga TODOS os agendamentos
- `deleteAllUsers.js` - ❌ **PERIGO**: Apaga TODOS os usuários
- `deleteUser0000.js` - ❌ Remove usuário específico
- `preencherAgendaTeste.js` - ❌ Cria agendamentos de teste
- `preencherAgendaTeste1000.js` - ❌ Cria 1000 agendamentos de teste
- `testarCrasIds.js` - ❌ Script de teste de CRAS
- `testarRotaRecepcao.js` - ❌ Teste de rotas da recepção

## 🚀 Como Executar os Scripts

```bash
# No diretório backend/
node scripts/nomeDoScript.js
```

## ⚠️ **ATENÇÃO**

- **Scripts de teste/desenvolvimento** estão no `.gitignore` e não devem ser commitados
- **NUNCA** execute scripts de delete em produção
- Scripts de migração devem ser executados com backup do banco
- Sempre teste scripts em ambiente de desenvolvimento primeiro

## 🔒 Segurança

Os scripts perigosos estão excluídos do Git para evitar execução acidental em produção. 

Se você precisar dos scripts de desenvolvimento, pode criar localmente ou solicitar ao desenvolvedor.
