/**
 * AppointmentForm - Formulário de agendamento reutilizável
 * 
 * Componente que centraliza os campos do formulário de agendamento
 * Usado tanto para criação quanto edição
 * 
 * @module AppointmentForm
 */

import { Box } from '@mui/material';
import FormTextField from './FormTextField';
import FormSelect from './FormSelect';
import { formatarCPF, formatarTelefone, motivosAtendimento } from '../../utils/agendamentoUtils';

export default function AppointmentForm({ 
  data, 
  onChange,
  readOnlyFields = []
}) {
  const handleFieldChange = (field) => (value) => {
    onChange({ ...data, [field]: value });
  };

  const isReadOnly = (field) => readOnlyFields.includes(field);

  return (
    <Box sx={{ mt: 2 }}>
      <FormTextField
        icon="👤"
        label="Nome Completo"
        value={data.pessoa || ''}
        onChange={handleFieldChange('pessoa')}
        required
        disabled={isReadOnly('pessoa')}
      />
      
      <FormTextField
        icon="📋"
        label="CPF"
        value={data.cpf || ''}
        onChange={handleFieldChange('cpf')}
        formatter={formatarCPF}
        maxLength={14}
        required
        disabled={isReadOnly('cpf')}
      />
      
      <FormTextField
        icon="📞"
        label="Telefone Principal"
        value={data.telefone1 || ''}
        onChange={handleFieldChange('telefone1')}
        formatter={formatarTelefone}
        maxLength={15}
        disabled={isReadOnly('telefone1')}
      />
      
      <FormTextField
        icon="📞"
        label="Telefone Alternativo (Opcional)"
        value={data.telefone2 || ''}
        onChange={handleFieldChange('telefone2')}
        formatter={formatarTelefone}
        maxLength={15}
        disabled={isReadOnly('telefone2')}
      />
      
      <FormSelect
        icon="🎯"
        label="Motivo do atendimento"
        value={data.motivo || ''}
        onChange={handleFieldChange('motivo')}
        options={motivosAtendimento}
        disabled={isReadOnly('motivo')}
      />
      
      <FormTextField
        icon="📝"
        label="Observações (Opcional)"
        value={data.observacoes || ''}
        onChange={handleFieldChange('observacoes')}
        multiline
        rows={3}
        disabled={isReadOnly('observacoes')}
      />
    </Box>
  );
}
