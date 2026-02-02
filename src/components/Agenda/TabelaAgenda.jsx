import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { horariosDisponiveis } from '../../utils/agendamentoUtils';
import HorarioTableRow from './HorarioTableRow';

export default function TabelaAgenda({
  data,
  horariosStatus,
  abrirModalObservacoes,
  abrirModalAgendamento,
  abrirModalEdicao,
  isEntrevistador
}) {
  return (
    <Paper elevation={2} sx={{ width: '100%', mt: 3 }}>
      <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider', textAlign: 'center' }}>
        Agenda - {data?.toLocaleDateString('pt-BR')}
      </Typography>
      
      <TableContainer sx={{ width: '100%' }}>
        <Table sx={{ width: '100%' }} size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Horário</TableCell>
              <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ width: '20%', fontWeight: 'bold' }}>Nome</TableCell>
              <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>CPF</TableCell>
              <TableCell sx={{ width: '15%', fontWeight: 'bold' }}>Telefones</TableCell>
              <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Motivo</TableCell>
              <TableCell sx={{ width: '5%', fontWeight: 'bold', textAlign: 'center' }}>Obs</TableCell>
              <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Criado Por</TableCell>
              <TableCell sx={{ width: '8%', fontWeight: 'bold', textAlign: 'center' }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {horariosDisponiveis.map((horario) => {
              const horarioData = horariosStatus[horario] || {};
              return (
                <HorarioTableRow
                  key={horario}
                  horario={horario}
                  status={horarioData.status || 'livre'}
                  agendamento={horarioData.agendamento}
                  bloqueio={horarioData.bloqueio}
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
    </Paper>
  );
}
