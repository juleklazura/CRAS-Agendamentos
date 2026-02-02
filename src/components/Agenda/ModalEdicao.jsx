/**
 * ModalEdicao - Modal para edição de agendamentos
 * 
 * Componente refatorado usando AppointmentForm reutilizável
 * Mantém apenas lógica de apresentação do modal
 * 
 * @module ModalEdicao
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { AppointmentForm } from '../Form';

export default function ModalEdicao({
  aberto,
  onFechar,
  onSalvar,
  dadosEdicao,
  setDadosEdicao
}) {
  const isFormValid = dadosEdicao.pessoa?.trim() && dadosEdicao.cpf?.trim();

  return (
    <Dialog open={aberto} onClose={onFechar} maxWidth="sm" fullWidth>
      <DialogTitle>✏️ Editar Agendamento</DialogTitle>
      <DialogContent>
        <AppointmentForm
          data={dadosEdicao}
          onChange={setDadosEdicao}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onFechar} size="large">
          Cancelar
        </Button>
        <Button 
          onClick={onSalvar} 
          variant="contained" 
          size="large"
          disabled={!isFormValid}
        >
          Salvar Alterações
        </Button>
      </DialogActions>
    </Dialog>
  );
}
