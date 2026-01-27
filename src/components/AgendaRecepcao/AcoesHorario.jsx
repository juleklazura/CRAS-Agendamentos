import { Box, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { exibirCPFFormatado } from '../../utils/agendamentoUtils';

export default function AcoesHorario({
  agendamento,
  bloqueado,
  onAgendar,
  onConfirmarPresenca,
  onMarcarAusente,
  onRemoverConfirmacao,
  onEditar,
  onExcluir,
  onVerObservacoes,
  dataSelecionada
}) {
  const agendado = !!agendamento;

  return (
    <Box display="flex" gap={1} justifyContent="center">
      {/* Botão de Agendar para horários disponíveis */}
      {!agendado && !bloqueado && onAgendar && (
        <IconButton
          color="primary"
          size="small"
          onClick={onAgendar}
          title="Agendar horário"
          disabled={dataSelecionada.getDay() === 0 || dataSelecionada.getDay() === 6}
        >
          <CheckCircleIcon fontSize="small" />
        </IconButton>
      )}

      {/* Ações para agendamentos */}
      {agendado && (
        <>
          {/* Botões de status (confirmar/ausente) */}
          {agendamento?.status !== 'realizado' && agendamento?.status !== 'ausente' ? (
            <>
              <IconButton
                color="success"
                size="small"
                onClick={() => onConfirmarPresenca(agendamento)}
                title="Confirmar presença"
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
              <IconButton
                color="warning"
                size="small"
                onClick={() => onMarcarAusente(agendamento)}
                title="Marcar como ausente"
              >
                <PersonOffIcon fontSize="small" />
              </IconButton>
            </>
          ) : agendamento?.status === 'realizado' ? (
            <IconButton
              color="warning"
              size="small"
              onClick={() => onRemoverConfirmacao(agendamento)}
              title="Remover confirmação"
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          ) : agendamento?.status === 'ausente' ? (
            <IconButton
              color="info"
              size="small"
              onClick={() => onRemoverConfirmacao(agendamento)}
              title="Remover status ausente"
            >
              <CancelIcon fontSize="small" />
            </IconButton>
          ) : null}

          {/* Botão de editar */}
          <IconButton
            color="primary"
            size="small"
            onClick={() => onEditar(agendamento)}
            title="Editar agendamento"
          >
            <EditIcon fontSize="small" />
          </IconButton>

          {/* Botão de excluir */}
          <IconButton
            color="error"
            size="small"
            onClick={() => onExcluir(agendamento)}
            title="Excluir agendamento"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>

          {/* Botão de ver observações */}
          <IconButton
            color="info"
            size="small"
            onClick={() => onVerObservacoes(agendamento)}
            title="Ver observações"
          >
            <DescriptionIcon fontSize="small" />
          </IconButton>
        </>
      )}
    </Box>
  );
}

export function InfoHorario({ agendamento, bloqueado }) {
  if (!agendamento && !bloqueado) {
    return (
      <Typography variant="body2" color="success.main">
        Disponível
      </Typography>
    );
  }

  if (bloqueado) {
    return (
      <Typography variant="body2" color="warning.main">
        Bloqueado
      </Typography>
    );
  }

  const statusColor = 
    agendamento?.status === 'realizado' ? 'success.main' :
    agendamento?.status === 'ausente' ? 'warning.main' :
    'primary.main';

  const statusText = 
    agendamento?.status === 'realizado' ? 'Realizado' :
    agendamento?.status === 'ausente' ? 'Ausente' :
    'Agendado';

  return (
    <>
      <Typography variant="body2" color={statusColor} fontWeight="medium">
        {statusText}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {agendamento?.pessoa || '-'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {exibirCPFFormatado(agendamento?.cpf)}
      </Typography>
      {agendamento?.telefone1 && (
        <Typography variant="body2" color="text.secondary">
          {agendamento.telefone1}
        </Typography>
      )}
      {agendamento?.telefone2 && (
        <Typography variant="body2" color="text.secondary">
          {agendamento.telefone2}
        </Typography>
      )}
    </>
  );
}
