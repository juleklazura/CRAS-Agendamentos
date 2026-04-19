import { ConfirmDialog } from '../UI';

export default function ModalExclusao({
  open,
  onClose,
  agendamento,
  onConfirmar
}) {
  return (
    <ConfirmDialog
      open={open}
      onCancel={onClose}
      onConfirm={onConfirmar}
      title="Excluir Agendamento"
      message={`Tem certeza que deseja excluir o agendamento de ${agendamento?.pessoa ?? 'esta pessoa'}? Esta ação não pode ser desfeita.`}
      confirmText="Excluir"
      cancelText="Cancelar"
      severity="error"
    />
  );
}
