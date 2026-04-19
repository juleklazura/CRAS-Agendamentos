import { Button, CircularProgress } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { ModalBase } from '../UI';
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
  const isFormValid =
    dadosAgendamento.pessoa?.trim() &&
    dadosAgendamento.cpf?.trim() &&
    dadosAgendamento.telefone1?.trim() &&
    dadosAgendamento.motivo?.trim();

  const subtitle = data
    ? `${horarioSelecionado} • ${data.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
    : horarioSelecionado;

  return (
    <ModalBase
      open={aberto}
      onClose={onFechar}
      icon={CalendarMonthIcon}
      title="Novo Agendamento"
      subtitle={subtitle}
      loading={loading}
      actions={
        <>
          <Button onClick={onFechar} variant="outlined" size="large" disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={onSalvar}
            variant="contained"
            size="large"
            disabled={loading || !isFormValid}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckRoundedIcon />}
          >
            {loading ? 'Salvando...' : 'Salvar Agendamento'}
          </Button>
        </>
      }
    >
      <AppointmentForm data={dadosAgendamento} onChange={setDadosAgendamento} />
    </ModalBase>
  );
}
