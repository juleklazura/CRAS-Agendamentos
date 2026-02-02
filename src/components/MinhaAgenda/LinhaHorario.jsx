import { memo } from 'react';
import { TableRow, TableCell, Typography, Box, IconButton, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { formatarCPF, formatarTelefone } from '../../utils/agendamentoUtils';

function LinhaHorario({ 
  horario, 
  agendamento, 
  bloqueado, 
  onAgendar,
  onConfirmarPresenca,
  onMarcarAusente,
  onRemoverConfirmacao,
  onEditar,
  onExcluir,
  onBloquear,
  onDesbloquear,
  onVisualizarObservacoes
}) {
  const agendado = !!agendamento;

  return (
    <TableRow 
      sx={{
        backgroundColor: 
          agendamento?.status === 'realizado' ? '#e8f5e8' : 
          agendamento?.status === 'ausente' ? '#fff9c4' : 
          'inherit'
      }}
    >
      <TableCell sx={{ fontWeight: 'bold' }}>{horario}</TableCell>
      <TableCell>
        <Typography
          color={
            agendado && agendamento?.status === 'realizado' ? 'success.main' :
            agendado && agendamento?.status === 'ausente' ? 'warning.main' :
            agendado ? 'primary.main' :
            bloqueado ? 'warning.main' :
            'success.main'
          }
        >
          {agendado && agendamento?.status === 'realizado' ? 'Realizado' :
           agendado && agendamento?.status === 'ausente' ? 'Ausente' :
           agendado ? 'Agendado' :
           bloqueado ? 'Bloqueado' :
           'Disponível'}
        </Typography>
      </TableCell>
      <TableCell>
        {agendamento ? agendamento.pessoa : '-'}
      </TableCell>
      <TableCell>
        {agendamento ? formatarCPF(agendamento.cpf) : '-'}
      </TableCell>
      <TableCell>
        {agendamento ? (
          <Box>
            <Typography variant="body2">{formatarTelefone(agendamento.telefone1)}</Typography>
            {agendamento.telefone2 && (
              <Typography variant="body2">{formatarTelefone(agendamento.telefone2)}</Typography>
            )}
          </Box>
        ) : '-'}
      </TableCell>
      <TableCell>
        {agendamento ? agendamento.motivo : '-'}
      </TableCell>
      <TableCell>
        {agendamento?.observacoes ? (
          <IconButton 
            size="small" 
            onClick={() => onVisualizarObservacoes(agendamento)}
          >
            <DescriptionIcon fontSize="small" />
          </IconButton>
        ) : '-'}
      </TableCell>
      <TableCell align="center">
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          {!agendado && !bloqueado && (
            <>
              <Button
                size="small"
                variant="contained"
                onClick={() => onAgendar(horario)}
              >
                Agendar
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => onBloquear(horario)}
              >
                Bloquear
              </Button>
            </>
          )}
          
          {agendado && (
            <>
              {agendamento.status !== 'realizado' && agendamento.status !== 'ausente' && (
                <>
                  <IconButton 
                    size="small" 
                    onClick={() => onConfirmarPresenca(agendamento)}
                    sx={{ color: 'success.main' }}
                    title="Confirmar Presença"
                  >
                    <CheckCircleIcon fontSize="small" />
                  </IconButton>
                  
                  <IconButton 
                    size="small" 
                    onClick={() => onMarcarAusente(agendamento)}
                    sx={{ color: 'warning.main' }}
                    title="Marcar como Ausente"
                  >
                    <PersonOffIcon fontSize="small" />
                  </IconButton>
                </>
              )}
              
              {(agendamento.status === 'realizado' || agendamento.status === 'ausente') && (
                <IconButton 
                  size="small" 
                  onClick={() => onRemoverConfirmacao(agendamento)}
                  sx={{ color: agendamento.status === 'realizado' ? 'warning.main' : 'info.main' }}
                  title={agendamento.status === 'realizado' ? 'Remover Confirmação' : 'Remover Status Ausente'}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              )}
              
              <IconButton 
                size="small" 
                onClick={() => onEditar(agendamento)}
                sx={{ color: 'primary.main' }}
                title="Editar"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              
              <IconButton 
                size="small" 
                onClick={() => onExcluir(agendamento)}
                sx={{ color: 'error.main' }}
                title="Excluir"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </>
          )}
          
          {bloqueado && (
            <Button
              size="small"
              variant="outlined"
              color="success"
              onClick={() => onDesbloquear(horario)}
              title="Desbloquear este horário"
            >
              Desbloquear
            </Button>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}

export default memo(LinhaHorario);
