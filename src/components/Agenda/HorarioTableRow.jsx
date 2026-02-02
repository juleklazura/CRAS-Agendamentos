import { memo } from 'react';
import {
  TableRow,
  TableCell,
  Typography,
  Box,
  IconButton,
  Button,
  Chip
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Event as EventIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { formatarCPF } from '../../utils/agendamentoUtils';

const HorarioTableRow = memo(({ 
  horario, 
  status, 
  agendamento, 
  bloqueio, 
  abrirModalObservacoes, 
  abrirModalAgendamento,
  abrirModalEdicao,
  isEntrevistador
}) => (
  <TableRow 
    sx={{
      backgroundColor: 
        status === 'realizado' ? '#e8f5e8' : 
        status === 'ausente' ? '#fff9c4' : 
        'inherit',
      transition: 'background 0.2s',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#e3e9f7',
        boxShadow: '0 2px 8px 0 rgba(30,73,118,0.08)'
      }
    }}
  >
    <TableCell>
      <Typography variant="body2" fontWeight="medium">
        {horario}
      </Typography>
    </TableCell>
    
    <TableCell>
      <Typography
        variant="body2"
        color={
          status === 'agendado' ? 'primary.main' :
          status === 'realizado' ? 'success.main' :
          status === 'ausente' ? 'warning.main' :
          status === 'bloqueado' ? 'warning.main' :
          'success.main'
        }
        fontWeight="medium"
      >
        {status === 'agendado' ? 'Agendado' :
         status === 'realizado' ? 'Realizado' :
         status === 'ausente' ? 'Ausente' :
         status === 'bloqueado' ? 'Bloqueado' :
         'Disponível'}
      </Typography>
    </TableCell>
    
    <TableCell>{agendamento?.pessoa || (bloqueio ? 'Horário Bloqueado' : '-')}</TableCell>
    <TableCell>{agendamento ? formatarCPF(agendamento.cpf) : '-'}</TableCell>
    
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
    
    <TableCell>{agendamento?.motivo || (bloqueio?.motivo || '-')}</TableCell>
    
    <TableCell>
      {agendamento?.observacoes ? (
        <IconButton
          color="primary"
          size="small"
          onClick={() => abrirModalObservacoes(agendamento)}
          title="Ver observações"
        >
          <DescriptionIcon fontSize="small" />
        </IconButton>
      ) : '-'}
    </TableCell>
    
    <TableCell>{agendamento?.createdBy?.name || bloqueio?.createdBy?.name || '-'}</TableCell>
    
    <TableCell align="center">
      {status === 'livre' && (
        <Button
          variant="contained"
          size="small"
          color="primary"
          onClick={() => abrirModalAgendamento(horario)}
          startIcon={<EventIcon />}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 'medium'
          }}
        >
          Agendar
        </Button>
      )}
      
      {status === 'agendado' && (
        <Box display="flex" gap={1} alignItems="center" justifyContent="center">
          <Chip 
            label="Ocupado" 
            color="primary" 
            size="small"
            icon={<PersonIcon />}
          />
          {isEntrevistador && (
            <IconButton
              color="primary"
              size="small"
              onClick={() => abrirModalEdicao(agendamento)}
              title="Editar agendamento"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
      
      {status === 'realizado' && (
        <Chip 
          label="Concluído" 
          color="success" 
          size="small"
          icon={<CheckCircleIcon />}
        />
      )}
      
      {status === 'bloqueado' && (
        <Chip 
          label="Indisponível" 
          color="warning" 
          size="small"
          icon={<BlockIcon />}
        />
      )}
    </TableCell>
  </TableRow>
));

HorarioTableRow.displayName = 'HorarioTableRow';

export default HorarioTableRow;
