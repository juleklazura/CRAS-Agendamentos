/**
 * Componente Row Individual de Agendamento
 * Responsabilidade: Renderizar uma linha da tabela
 * Memoizado para evitar re-renders desnecessários
 */
import { memo } from 'react';
import {
  TableRow,
  TableCell,
  IconButton,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';

import { STATUS_OPTIONS } from '../../constants/agendamentos';
import { sanitizeText, formatarCPFExibicao } from '../../utils/formatters';

/**
 * Componente de linha de agendamento memoizado
 * Re-renderiza APENAS quando props mudam
 */
const AgendamentoRow = memo(({ 
  agendamento, 
  canDelete, 
  onDelete, 
  onViewObservacoes,
  deleting 
}) => {
  return (
    <TableRow hover>
      <TableCell>{sanitizeText(agendamento.entrevistador?.name)}</TableCell>
      <TableCell>{sanitizeText(agendamento.cras?.nome)}</TableCell>
      <TableCell>{sanitizeText(agendamento.pessoa)}</TableCell>
      <TableCell>{formatarCPFExibicao(agendamento.cpf)}</TableCell>
      <TableCell>
        {sanitizeText(agendamento.telefone1)}
        {agendamento.telefone2 && (
          <>
            <br />
            {sanitizeText(agendamento.telefone2)}
          </>
        )}
      </TableCell>
      <TableCell>{sanitizeText(agendamento.motivo)}</TableCell>
      <TableCell>
        {new Date(agendamento.data).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </TableCell>
      <TableCell>
        {STATUS_OPTIONS.find(s => s.value === agendamento.status)?.label || agendamento.status}
      </TableCell>
      <TableCell>{sanitizeText(agendamento.createdBy?.name)}</TableCell>
      <TableCell>
        <IconButton
          color="primary"
          size="small"
          onClick={() => onViewObservacoes(agendamento)}
          aria-label={`Ver observações de ${agendamento.pessoa}`}
          title="Ver observações"
        >
          <DescriptionIcon fontSize="small" />
        </IconButton>
      </TableCell>
      <TableCell align="center">
        {canDelete ? (
          <IconButton
            onClick={() => onDelete(agendamento._id, agendamento)}
            color="error"
            size="small"
            aria-label={`Excluir agendamento de ${agendamento.pessoa}`}
            title="Excluir agendamento"
            disabled={deleting}
          >
            <DeleteIcon />
          </IconButton>
        ) : (
          <Typography variant="caption" color="text.disabled">
            Sem permissão
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // Comparação customizada para otimizar re-renders
  return (
    prevProps.agendamento._id === nextProps.agendamento._id &&
    prevProps.canDelete === nextProps.canDelete &&
    prevProps.deleting === nextProps.deleting
  );
});

AgendamentoRow.displayName = 'AgendamentoRow';

export default AgendamentoRow;
