# 🔄 Guia de Migração - Arquitetura Modular

## 📋 Checklist de Migração

Use este guia para migrar gradualmente os componentes e controllers existentes para a nova arquitetura.

---

## 🎨 Frontend - Migração de Componentes

### ✅ Modais de Agendamento

#### Status de Migração

| Componente | Status | Localização |
|------------|--------|-------------|
| ModalEdicao | ✅ Migrado | [src/components/Agenda/ModalEdicao.jsx](src/components/Agenda/ModalEdicao.jsx) |
| ModalAgendamento | ✅ Migrado | [src/components/Agenda/ModalAgendamento.jsx](src/components/Agenda/ModalAgendamento.jsx) |
| ModalObservacoes | ⏳ Pendente | src/components/Agenda/ModalObservacoes.jsx |
| AgendaRecepcao/ModalAgendamento | ⏳ Pendente | src/components/AgendaRecepcao/ModalAgendamento.jsx |
| AgendaRecepcao/ModalEdicao | ⏳ Pendente | src/components/AgendaRecepcao/ModalEdicao.jsx |

#### Como Migrar um Modal

**Passo 1:** Identificar campos do formulário
```jsx
// ❌ Antes
<TextField label="Nome" value={data.nome} onChange={...} />
<TextField label="CPF" value={data.cpf} onChange={(e) => setData({...data, cpf: formatarCPF(e.target.value)})} />
```

**Passo 2:** Substituir por AppointmentForm
```jsx
// ✅ Depois
import { AppointmentForm } from '../Form';

<AppointmentForm 
  data={data} 
  onChange={setData}
  readOnlyFields={[]} // Campos que não devem ser editáveis
/>
```

**Passo 3:** Remover imports desnecessários
```jsx
// ❌ Remover
import { TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { formatarCPF, formatarTelefone, motivosAtendimento } from '../../utils/agendamentoUtils';

// ✅ Manter apenas
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { AppointmentForm } from '../Form';
```

### ✅ Páginas com Lógica Complexa

#### Status de Migração

| Página | Hooks a Usar | Status |
|--------|--------------|--------|
| Agenda.jsx | useModal, useApiRequest | ⏳ Pendente |
| AgendaRecepcao.jsx | useModal, useApiRequest, usePagination | ⏳ Pendente |
| Dashboard.jsx | useApiRequest, useDebounce | ⏳ Pendente |
| Usuarios.jsx | useModal, useForm, usePagination | ⏳ Pendente |

#### Como Migrar uma Página

**Passo 1:** Identificar lógica repetitiva
```jsx
// ❌ Antes - Lógica inline
const [modalAberto, setModalAberto] = useState(false);
const [dadosModal, setDadosModal] = useState(null);
const abrirModal = (dados) => {
  setDadosModal(dados);
  setModalAberto(true);
};
const fecharModal = () => {
  setModalAberto(false);
  setDadosModal(null);
};
```

**Passo 2:** Usar hook especializado
```jsx
// ✅ Depois - Hook reutilizável
import useModal from '../hooks/useModal';

const { isOpen, data, openModal, closeModal } = useModal();
```

**Exemplo Completo - Migração de Página:**

```jsx
// ❌ ANTES
import { useState } from 'react';

function MinhaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [dados, setDados] = useState(null);
  
  const buscarDados = async () => {
    setLoading(true);
    try {
      const response = await api.get('/endpoint');
      setDados(response.data);
    } catch (err) {
      setError(err.message);
      showNotification('Erro ao buscar dados', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const abrirModal = () => setModalAberto(true);
  const fecharModal = () => setModalAberto(false);
  
  return (
    // ... JSX
  );
}

// ✅ DEPOIS
import useModal from '../hooks/useModal';
import useApiRequest from '../hooks/useApiRequest';

function MinhaPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const { loading, data, execute } = useApiRequest();
  
  const buscarDados = () => execute(
    () => api.get('/endpoint'),
    {
      errorMessage: 'Erro ao buscar dados',
      showError: true
    }
  );
  
  return (
    // ... JSX usando isOpen, openModal, closeModal
  );
}
```

---

## 🔧 Backend - Migração de Controllers

### ✅ Controllers

#### Status de Migração

| Controller | Status | Localização |
|------------|--------|-------------|
| appointmentController | ✅ Service criado | [backend/services/appointmentService.js](backend/services/appointmentService.js) |
| userController | ⏳ Pendente | backend/controllers/userController.js |
| crasController | ⏳ Pendente | backend/controllers/crasController.js |
| authController | ⏳ Pendente | backend/controllers/authController.js |
| logController | ⏳ Pendente | backend/controllers/logController.js |
| blockedSlotController | ⏳ Pendente | backend/controllers/blockedSlotController.js |

#### Como Migrar um Controller

**Passo 1:** Criar Service
```javascript
// backend/services/meuService.js
class MeuService {
  async criarItem(data, userId) {
    // Lógica de negócio aqui
    const item = new Model(data);
    await item.save();
    return item;
  }
  
  async listarItens(filters) {
    // Lógica de consulta aqui
    return await Model.find(filters);
  }
}

export default new MeuService();
```

**Passo 2:** Criar Validações
```javascript
// backend/services/validationService.js
class ValidationService {
  validateMeuItem(data) {
    const errors = [];
    
    if (!data.campo1) {
      errors.push({ field: 'campo1', message: 'Campo obrigatório' });
    }
    
    if (errors.length > 0) {
      const error = new Error('Dados inválidos');
      error.statusCode = 400;
      error.validationErrors = errors;
      throw error;
    }
    
    return true;
  }
}
```

**Passo 3:** Refatorar Controller
```javascript
// ❌ ANTES - Controller monolítico
export const criarItem = async (req, res) => {
  try {
    // 20 linhas de validação
    if (!req.body.campo1) return res.status(400).json({...});
    if (!req.body.campo2) return res.status(400).json({...});
    
    // 30 linhas de lógica de negócio
    const item = new Model({...});
    await item.save();
    
    // 10 linhas de logging
    await Log.create({...});
    
    res.status(201).json(item);
  } catch (err) {
    // 15 linhas de tratamento de erro
    res.status(400).json({...});
  }
};

// ✅ DEPOIS - Controller fino
import meuService from '../services/meuService.js';
import validationService from '../services/validationService.js';

export const criarItem = async (req, res) => {
  try {
    validationService.validateMeuItem(req.body);
    const item = await meuService.criarItem(req.body, req.user.id);
    res.status(201).json(item);
  } catch (err) {
    handleError(err, res);
  }
};
```

---

## 📦 Ordem Recomendada de Migração

### Frontend (2-3 dias)

**Dia 1: Componentes Base**
1. ✅ Criar componentes Form (✅ Concluído)
2. ✅ Criar hooks reutilizáveis (✅ Concluído)
3. ⏳ Migrar ModalObservacoes
4. ⏳ Migrar modais de AgendaRecepcao

**Dia 2: Páginas Principais**
1. ⏳ Migrar Agenda.jsx para usar hooks
2. ⏳ Migrar AgendaRecepcao.jsx para usar hooks
3. ⏳ Adicionar useDebounce em buscas

**Dia 3: Páginas Administrativas**
1. ⏳ Migrar Dashboard.jsx
2. ⏳ Migrar Usuarios.jsx com useForm
3. ⏳ Migrar Cras.jsx

### Backend (2-3 dias)

**Dia 1: Services Base**
1. ✅ Criar appointmentService (✅ Concluído)
2. ✅ Criar validationService (✅ Concluído)
3. ⏳ Criar userService
4. ⏳ Criar authService

**Dia 2: Services Adicionais**
1. ⏳ Criar crasService
2. ⏳ Criar logService
3. ⏳ Criar blockedSlotService

**Dia 3: Refatorar Controllers**
1. ⏳ Refatorar userController
2. ⏳ Refatorar crasController
3. ⏳ Refatorar authController

---

## 🧪 Testes Durante Migração

### Frontend - Checklist de Testes

Para cada componente migrado:
- [ ] Formulário abre corretamente
- [ ] Campos são preenchidos
- [ ] Validação funciona
- [ ] Submissão salva dados
- [ ] Modal fecha após salvar
- [ ] Notificações aparecem
- [ ] Loading states funcionam

### Backend - Checklist de Testes

Para cada controller migrado:
- [ ] Endpoint responde corretamente
- [ ] Validações retornam erros apropriados
- [ ] Dados são salvos no banco
- [ ] Cache é invalidado
- [ ] Logs são criados
- [ ] Autorização funciona

---

## 📝 Script de Migração Automática

### Encontrar Componentes Candidatos

```bash
# Encontrar componentes com formulários duplicados
grep -r "TextField" src/components/ | grep "label=\"Nome\""

# Encontrar controllers com lógica monolítica
wc -l backend/controllers/*.js | sort -n

# Encontrar uso de useState que pode ser hook
grep -r "useState" src/pages/ | wc -l
```

### Analisar Complexidade

```bash
# Contar linhas por arquivo (identificar monolitos)
find src/components -name "*.jsx" -exec wc -l {} \; | sort -n

# Identificar duplicação de código
jsinspect src/components/
```

---

## ⚠️ Cuidados Durante Migração

### ❌ NÃO Fazer

- ❌ Migrar tudo de uma vez (fazer incremental)
- ❌ Mudar API sem versionar
- ❌ Deletar código antigo imediatamente
- ❌ Testar apenas no final

### ✅ FAZER

- ✅ Migrar um componente/controller por vez
- ✅ Testar após cada migração
- ✅ Manter código antigo comentado temporariamente
- ✅ Documentar mudanças no commit
- ✅ Fazer code review de cada migração

---

## 🎯 Checklist Final

Antes de considerar migração completa:

### Frontend
- [ ] Todos os modais usam AppointmentForm
- [ ] Todas as páginas usam hooks especializados
- [ ] Sem duplicação de lógica de formulário
- [ ] useDebounce implementado em buscas
- [ ] useModal em todos os modais
- [ ] useApiRequest em todas as requisições

### Backend
- [ ] Todos os controllers usam services
- [ ] Validações centralizadas em validationService
- [ ] Lógica de negócio em services
- [ ] Controllers finos (< 50 linhas por função)
- [ ] Testes unitários para services
- [ ] Documentação atualizada

---

## 📞 Suporte

Se encontrar problemas durante migração:

1. Consultar [ARQUITETURA.md](ARQUITETURA.md)
2. Ver exemplos em componentes já migrados
3. Verificar logs de erro
4. Testar em ambiente de desenvolvimento

**Mantenha este guia atualizado conforme migra componentes!**
