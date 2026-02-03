// Tabela de agendamentos
// Componente separado para melhor organização e performance

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import { STATUS_OPTIONS } from '../../constants/agendamentos';
import { sanitizeText, formatarCPFExibicao, formatDateTime } from '../../utils/formatters';

/**
 * Componente de tabela de agendamentos
 * @param {Object} props
 * @param {Array} props.agendamentos - Lista de agendamentos a exibir
 * @param {Function} props.onDelete - Callback para deletar agendamento
 * @param {Function} props.onViewObservacoes - Callback para ver observações
 * @param {boolean} props.loading - Se está carregando
 * @param {string} props.search - Termo de busca atual
 */
export default function TabelaAgendamentos({ 
  agendamentos, 
  onDelete, 
  onViewObservacoes,
  loading,
  search
}) {
  if (loading) {
    return null; // O loading é tratado no componente pai
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>Entrevistador</strong></TableCell>
            <TableCell><strong>CRAS</strong></TableCell>
            <TableCell><strong>Nome</strong></TableCell>
            <TableCell><strong>CPF</strong></TableCell>
            <TableCell><strong>Telefones</strong></TableCell>
            <TableCell><strong>Motivo</strong></TableCell>
            <TableCell><strong>Data/Hora</strong></TableCell>
            <TableCell><strong>Status</strong></TableCell>
            <TableCell><strong>Criado Por</strong></TableCell>
            <TableCell><strong>Observações</strong></TableCell>
            <TableCell align="center"><strong>Ações</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {agendamentos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} align="center">
                <Box py={4}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {search 
                      ? `Nenhum agendamento encontrado para "${search}"` 
                      : 'Nenhum agendamento cadastrado'}
                  </Typography>
                  {!search && (
                    <Typography variant="body2" color="text.secondary">
                      Vá para a página "Agenda" para criar novos agendamentos
                    </Typography>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            agendamentos.map((agendamento) => (
              <TableRow key={agendamento._id}>
                <TableCell>{sanitizeText(agendamento.entrevistador?.name)}</TableCell>
                <TableCell>{sanitizeText(agendamento.cras?.nome)}</TableCell>
                <TableCell>{sanitizeText(agendamento.pessoa)}</TableCell>
                <TableCell>{formatarCPFExibicao(agendamento.cpf)}</TableCell>
                <TableCell>
                  {sanitizeText(agendamento.telefone1)}
                  {agendamento.telefone2 && <><br />{sanitizeText(agendamento.telefone2)}</>}
                </TableCell>
                <TableCell>{sanitizeText(agendamento.motivo)}</TableCell>
                <TableCell>{formatDateTime(agendamento.data)}</TableCell>
                <TableCell>
                  {STATUS_OPTIONS.find(s => s.value === agendamento.status)?.label || agendamento.status}
                </TableCell>
                <TableCell>{sanitizeText(agendamento.createdBy?.name)}</TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={() => onViewObservacoes(agendamento)}
                    title="Ver observações"
                  >
                    <DescriptionIcon fontSize="small" />
                  </IconButton>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    onClick={() => onDelete(agendamento._id, agendamento)}
                    color="error"
                    size="small"
                    title="Excluir agendamento"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
