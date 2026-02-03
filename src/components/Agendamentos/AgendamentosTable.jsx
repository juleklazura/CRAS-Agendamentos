/**
 * Componente de Tabela de Agendamentos
 * Responsabilidade: Renderizar tabela com cabeçalho e linhas
 * Separado para melhor organização e testabilidade
 */
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Typography,
  Skeleton
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';

import AgendamentoRow from './AgendamentoRow';

/**
 * Cabeçalho da tabela com ordenação
 */
const TableHeader = ({ orderBy, order, onSort }) => {
  const headers = [
    { id: 'entrevistador', label: 'Entrevistador', sortable: true },
    { id: 'cras', label: 'CRAS', sortable: true },
    { id: 'pessoa', label: 'Nome', sortable: true },
    { id: 'cpf', label: 'CPF', sortable: false },
    { id: 'telefones', label: 'Telefones', sortable: false },
    { id: 'motivo', label: 'Motivo', sortable: true },
    { id: 'data', label: 'Data/Hora', sortable: true },
    { id: 'status', label: 'Status', sortable: false },
    { id: 'createdBy', label: 'Criado Por', sortable: false },
    { id: 'observacoes', label: 'Observações', sortable: false },
    { id: 'acoes', label: 'Ações', sortable: false }
  ];

  return (
    <TableHead>
      <TableRow>
        {headers.map((header) => (
          <TableCell
            key={header.id}
            onClick={header.sortable ? () => onSort(header.id) : undefined}
            sx={{
              cursor: header.sortable ? 'pointer' : 'default',
              fontWeight: 'bold',
              userSelect: 'none',
              '&:hover': header.sortable ? {
                backgroundColor: 'action.hover'
              } : undefined
            }}
            align={header.id === 'acoes' ? 'center' : 'left'}
          >
            {header.label}
            {header.sortable && orderBy === header.id && (
              <span style={{ marginLeft: '4px' }}>
                {order === 'asc' ? '▲' : '▼'}
              </span>
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};

/**
 * Estado vazio da tabela
 */
const EmptyState = ({ search }) => (
  <TableRow>
    <TableCell colSpan={11} align="center">
      <Box py={4}>
        <DescriptionIcon color="disabled" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {search 
            ? 'Nenhum agendamento encontrado' 
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
);

/**
 * Loading skeleton da tabela
 */
const LoadingSkeleton = ({ rowsPerPage }) => (
  <>
    {Array.from({ length: rowsPerPage }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        {Array.from({ length: 11 }).map((_, cellIndex) => (
          <TableCell key={`cell-${cellIndex}`}>
            <Skeleton animation="wave" height={20} />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

/**
 * Componente principal da tabela
 */
export default function AgendamentosTable({
  agendamentos,
  loading,
  search,
  rowsPerPage,
  orderBy,
  order,
  onSort,
  canDeleteFn,
  onDelete,
  onViewObservacoes,
  deleting,
  user
}) {
  return (
    <TableContainer component={Paper} elevation={2}>
      <Table>
        <TableHeader 
          orderBy={orderBy} 
          order={order} 
          onSort={onSort} 
        />
        <TableBody>
          {loading ? (
            <LoadingSkeleton rowsPerPage={rowsPerPage} />
          ) : agendamentos.length === 0 ? (
            <EmptyState search={search} />
          ) : (
            agendamentos.map((agendamento) => (
              <AgendamentoRow
                key={agendamento._id}
                agendamento={agendamento}
                canDelete={canDeleteFn(agendamento, user)}
                onDelete={onDelete}
                onViewObservacoes={onViewObservacoes}
                deleting={deleting}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
