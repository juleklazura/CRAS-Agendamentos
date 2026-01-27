import { TableRow, TableCell, Typography, Box, IconButton, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import EventIcon from '@mui/icons-material/Event';
import { exibirCPFFormatado } from '../../utils/agendamentoUtils';

export default function LinhaHorario({
  horario,
  agendamento,
  bloqueado,
  dataSelecionada,
  onAbrirModalAgendamento,
  onConfirmarPresenca,
  onMarcarAusente,
  onRemoverConfirmacao,
  onAbrirModalEdicao,
  onAbrirModalExclusao,
  onAbrirModalObservacoes
}) {
  const agendado = !!agendamento;
  
  const backgroundColor = 
    agendamento?.status === 'realizado' ? '#e8f5e8' : 
    agendamento?.status === 'ausente' ? '#fff9c4' :
    bloqueado ? '#fff3e0' : 
    'inherit';

  const statusColor = 
    agendado && agendamento?.status === 'realizado' ? 'success.main' :
    agendado && agendamento?.status === 'ausente' ? 'warning.main' :
    agendado ? 'primary.main' :
    bloqueado ? 'warning.main' :
    'success.main';

  const statusText = 
    agendado && agendamento?.status === 'realizado' ? 'Realizado' :
    agendado && agendamento?.status === 'ausente' ? 'Ausente' :
    agendado ? 'Agendado' :
    bloqueado ? 'Bloqueado' :
    'Disponível';

  return (
    <TableRow sx={{ backgroundColor }}>
      <TableCell>
        <Typography variant="body2" fontWeight="medium">
          {horario}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2" color={statusColor}>
          {statusText}
        </Typography>
      </TableCell>
      
      <TableCell>
        {agendamento?.pessoa || (bloqueado ? 'Horário Bloqueado' : '-')}
      </TableCell>
      
      <TableCell>
        {exibirCPFFormatado(agendamento?.cpf)}
      </TableCell>
      
      <TableCell>
        {agendamento ? (
          <Box>
            <Typography variant="body2">{agendamento.telefone1}</Typography>
            {agendamento.telefone2 && (
              <Typography variant="body2">{agendamento.telefone2}</Typography>
            )}
          </Box>
        ) : '-'}
      </TableCell>
      
      <TableCell>
        {agendamento?.motivo || (bloqueado ? 'Bloqueio' : '-')}
      </TableCell>
      
      <TableCell align="center">
        {agendamento ? (
          <IconButton
            color="primary"
            size="small"
            onClick={() => onAbrirModalObservacoes(agendamento)}
            title="Ver observações"
          >
            <DescriptionIcon fontSize="small" />
          </IconButton>
        ) : '-'}
      </TableCell>
      
      <TableCell>
        {agendamento?.createdBy?.name || '-'}
      </TableCell>
      
      <TableCell align="center">
        <Box display="flex" gap={1} justifyContent="center">
          {!agendado && !bloqueado ? (
            <Button
              variant="contained"
              size="small"
              color="primary"
              onClick={() => onAbrirModalAgendamento(horario)}
              startIcon={<EventIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 'medium'
              }}
              disabled={dataSelecionada.getDay() === 0 || dataSelecionada.getDay() === 6}
            >
              Agendar
            </Button>
          ) : null}
          
          {agendado ? (
            <>
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
              
              <IconButton
                color="primary"
                size="small"
                onClick={() => onAbrirModalEdicao(agendamento)}
                title="Editar agendamento"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              
              <IconButton
                color="error"
                size="small"
                onClick={() => onAbrirModalExclusao(agendamento)}
                title="Excluir agendamento"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          ) : null}
        </Box>
      </TableCell>
    </TableRow>
  );
}
