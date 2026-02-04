/**
 * LogsTable - Tabela de logs do sistema
 */

import { memo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import DescriptionIcon from '@mui/icons-material/Description';

const LogsTable = memo(({
  logs,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onViewDetails,
  search
}) => {
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Usuário</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>CRAS</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Ação</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Detalhes</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Data</TableCell>
            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                  <DescriptionIcon color="disabled" sx={{ fontSize: 48 }} />
                  <Typography variant="body1" color="text.secondary">
                    {search 
                      ? 'Nenhum log encontrado para a busca realizada' 
                      : 'Nenhum log registrado no sistema'
                    }
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            logs.map(log => (
              <TableRow key={log._id} hover>
                <TableCell>{log.user?.name || '-'}</TableCell>
                <TableCell>{log.cras?.nome || '-'}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>
                  {log.details && log.details.length > 50 
                    ? `${log.details.substring(0, 50)}...` 
                    : log.details || '-'
                  }
                </TableCell>
                <TableCell>{formatDate(log.date)}</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => onViewDetails(log)}
                    title="Ver detalhes completos"
                  >
                    <InfoIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="pagination-container">
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Linhas por página"
        />
      </div>
    </TableContainer>
  );
});

LogsTable.displayName = 'LogsTable';

export default LogsTable;
