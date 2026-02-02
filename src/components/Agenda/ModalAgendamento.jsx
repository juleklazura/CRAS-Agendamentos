/**
 * ModalAgendamento - Modal para criar novo agendamento
 * 
 * Componente refatorado usando AppointmentForm reutilizável
 * 
 * @module ModalAgendamento
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AppointmentForm } from '../Form';

export default function ModalAgendamento({
  aberto,
  onFechar,
  onSalvar,
  dadosAgendamento,
  setDadosAgendamento,
  horarioSelecionado,
  data,
  loading
}) {
  const isFormValid = dadosAgendamento.pessoa?.trim() && 
                      dadosAgendamento.cpf?.trim() && 
                      dadosAgendamento.telefone1?.trim() && 
                      dadosAgendamento.motivo?.trim();

  return (
    <Dialog open={aberto} onClose={onFechar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 2 }}>
        📅 Novo Agendamento
        <Box component="span" sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mt: 1 }}>
          {horarioSelecionado} • {data?.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Box>
      </DialogTitle>
      <DialogContent>
        <AppointmentForm
          data={dadosAgendamento}
          onChange={setDadosAgendamento}
        />
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onFechar} size="large" disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={onSalvar} 
          variant="contained"
          size="large"
          disabled={loading || !isFormValid}
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
        >
          {loading ? '💾 Salvando dados...' : 'Salvar Agendamento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
