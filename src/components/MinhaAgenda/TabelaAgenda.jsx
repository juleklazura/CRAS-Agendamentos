import { 
  TableContainer, 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell, 
  Paper 
} from '@mui/material';
import LinhaHorario from './LinhaHorario';
import { horariosDisponiveis } from '../../utils/agendamentoUtils';

export default function TabelaAgenda({ 
  dataSelecionada,
  obterAgendamento,
  verificarHorarioBloqueado,
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
  return (
    <TableContainer component={Paper} sx={{ 
      width: '100%',
      borderRadius: 3,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      overflow: 'hidden',
      border: '1px solid rgba(0, 0, 0, 0.08)'
    }}>
      <Table sx={{ width: '100%' }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
            <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Horário</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Nome</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>CPF</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Telefones</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Motivo</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: '#1E4976' }}>Observações</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1E4976' }}>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {horariosDisponiveis.map(horario => (
            <LinhaHorario
              key={horario}
              horario={horario}
              agendamento={obterAgendamento(dataSelecionada, horario)}
              bloqueado={verificarHorarioBloqueado(dataSelecionada, horario)}
              onAgendar={onAgendar}
              onConfirmarPresenca={onConfirmarPresenca}
              onMarcarAusente={onMarcarAusente}
              onRemoverConfirmacao={onRemoverConfirmacao}
              onEditar={onEditar}
              onExcluir={onExcluir}
              onBloquear={onBloquear}
              onDesbloquear={onDesbloquear}
              onVisualizarObservacoes={onVisualizarObservacoes}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
