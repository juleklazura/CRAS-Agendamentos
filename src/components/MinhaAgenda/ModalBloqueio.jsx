import { ConfirmDialog } from '../UI';
import BlockIcon from '@mui/icons-material/Block';

export default function ModalBloqueio({
  open,
  onClose,
  horarioParaBloqueio,
  dataSelecionada,
  onConfirmar
}) {
  const dataFormatada = dataSelecionada?.toLocaleDateString('pt-BR');

  return (
    <ConfirmDialog
      open={open}
      onCancel={onClose}
      onConfirm={onConfirmar}
      title="Bloquear Horário"
      message={`Deseja bloquear o horário ${horarioParaBloqueio} do dia ${dataFormatada}? Este horário não estará disponível para novos agendamentos.`}
      confirmText="Bloquear"
      cancelText="Cancelar"
      severity="warning"
      confirmIcon={BlockIcon}
    />
  );
}
