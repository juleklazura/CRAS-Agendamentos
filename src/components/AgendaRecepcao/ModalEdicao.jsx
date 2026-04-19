import { Button } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { ModalBase } from '../UI';
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
    <ModalBase
      open={aberto}
      onClose={onFechar}
      icon={EditRoundedIcon}
      title="Editar Agendamento"
      actions={
        <>
          <Button onClick={onFechar} variant="outlined" size="large">
            Cancelar
          </Button>
          <Button
            onClick={onSalvar}
            variant="contained"
            size="large"
            disabled={!isFormValid}
            startIcon={<CheckRoundedIcon />}
          >
            Salvar Alterações
          </Button>
        </>
      }
    >
      <AppointmentForm data={dadosEdicao} onChange={setDadosEdicao} />
    </ModalBase>
  );
}
