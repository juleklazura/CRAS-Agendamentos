/**
 * Componente de Paginação de Agendamentos
 * Responsabilidade: Controle de paginação
 */
import { Box, TablePagination } from '@mui/material';
import { PAGINATION_CONFIG } from '../../constants/agendamentos';

export default function AgendamentosPagination({ 
  total, 
  page, 
  rowsPerPage, 
  onPageChange, 
  onRowsPerPageChange 
}) {
  return (
    <Box display="flex" justifyContent="center" mt={2}>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          onRowsPerPageChange(parseInt(e.target.value, 10));
        }}
        rowsPerPageOptions={PAGINATION_CONFIG.rowsPerPageOptions}
        labelRowsPerPage="Agendamentos por página"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
      />
    </Box>
  );
}
