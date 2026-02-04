/**
 * AgendaTable - Tabela principal de horários da agenda
 */

import { memo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress
} from '@mui/material';
import HorarioTableRow from './HorarioTableRow';

const AgendaTable = memo(({ 
  horariosAgenda,
  getStatusHorarioDetalhado,
  abrirModalObservacoes,
  abrirModalAgendamento,
  abrirModalEdicao,
  isEntrevistador,
  loading
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Carregando agenda...
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Horário</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>CPF</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Telefones</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Motivo</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Observações</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Criado Por</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
          </TableRow>
        </TableHead>
        
        <TableBody>
          {horariosAgenda.map((horario) => {
            const { status, agendamento, bloqueio } = getStatusHorarioDetalhado(horario);
            return (
              <HorarioTableRow
                key={horario}
                horario={horario}
                status={status}
                agendamento={agendamento}
                bloqueio={bloqueio}
                abrirModalObservacoes={abrirModalObservacoes}
                abrirModalAgendamento={abrirModalAgendamento}
                abrirModalEdicao={abrirModalEdicao}
                isEntrevistador={isEntrevistador}
              />
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

AgendaTable.displayName = 'AgendaTable';

export default AgendaTable;
