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
import LinhaHorario from './LinhaHorario';

export default function TabelaHorarios({
  dataSelecionada,
  obterAgendamento,
  verificarHorarioBloqueado,
  onAbrirModalAgendamento,
  onConfirmarPresenca,
  onMarcarAusente,
  onRemoverConfirmacao,
  onAbrirModalEdicao,
  onAbrirModalExclusao,
  onAbrirModalObservacoes
}) {
  return (
    <Paper elevation={2} sx={{ width: '100%', mt: 1 }}>
      <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider', textAlign: 'center' }}>
        Agenda - {dataSelecionada?.toLocaleDateString('pt-BR')}
      </Typography>
      
      <TableContainer sx={{ width: '100%' }}>
        <Table sx={{ width: '100%' }} size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '8%', fontWeight: 'bold' }}>Horário</TableCell>
              <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ width: '18%', fontWeight: 'bold' }}>Nome</TableCell>
              <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>CPF</TableCell>
              <TableCell sx={{ width: '18%', fontWeight: 'bold' }}>Telefones</TableCell>
              <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>Motivo</TableCell>
              <TableCell sx={{ width: '6%', fontWeight: 'bold', textAlign: 'center' }}>Obs</TableCell>
              <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>Criado Por</TableCell>
              <TableCell sx={{ width: '4%', fontWeight: 'bold', textAlign: 'center' }}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {horariosDisponiveis.map((horario) => {
              const agendamento = obterAgendamento(horario);
              const bloqueado = verificarHorarioBloqueado(horario);
              
              return (
                <LinhaHorario
                  key={horario}
                  horario={horario}
                  agendamento={agendamento}
                  bloqueado={bloqueado}
                  dataSelecionada={dataSelecionada}
                  onAbrirModalAgendamento={onAbrirModalAgendamento}
                  onConfirmarPresenca={onConfirmarPresenca}
                  onMarcarAusente={onMarcarAusente}
                  onRemoverConfirmacao={onRemoverConfirmacao}
                  onAbrirModalEdicao={onAbrirModalEdicao}
                  onAbrirModalExclusao={onAbrirModalExclusao}
                  onAbrirModalObservacoes={onAbrirModalObservacoes}
                />
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
