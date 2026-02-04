/**
 * AgendaFilters - Filtros de entrevistador e data da agenda
 */

import { memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import ptBR from 'date-fns/locale/pt-BR';
import { ehFimDeSemana } from '../../utils/agendamentoUtils';

const AgendaFilters = memo(({ 
  entrevistadores,
  selectedEntrevistador,
  onEntrevistadorChange,
  data,
  onDataChange,
  loading,
  isEntrevistador
}) => {
  // Não mostrar filtros para entrevistadores (eles veem apenas sua agenda)
  if (isEntrevistador) return null;

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1} mb={2}>
        <PersonIcon color="primary" />
        Seleções da Agenda
      </Typography>
      
      <Box display="flex" gap={3} alignItems="flex-start" flexWrap="wrap">
        {/* Dropdown para seleção de entrevistador */}
        <Box sx={{ minWidth: 300, flex: 1 }}>
          <Typography variant="body1" fontWeight="medium" mb={1}>
            Entrevistador
          </Typography>
          <FormControl fullWidth sx={{ maxWidth: 400 }}>
            <InputLabel>Escolha o entrevistador</InputLabel>
            <Select
              value={selectedEntrevistador}
              label="Escolha o entrevistador"
              onChange={(e) => onEntrevistadorChange(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="">
                <em>Selecione um entrevistador</em>
              </MenuItem>
              {entrevistadores.map((entrevistador) => (
                <MenuItem key={entrevistador._id} value={entrevistador._id}>
                  {entrevistador.name}
                </MenuItem>
              ))}
            </Select>
            {selectedEntrevistador && (
              <FormHelperText>
                Visualizando agenda de: {entrevistadores.find(e => e._id === selectedEntrevistador)?.name}
              </FormHelperText>
            )}
          </FormControl>
        </Box>

        {/* Seletor de data */}
        {selectedEntrevistador && (
          <Box sx={{ minWidth: 300, flex: 1 }}>
            <Typography variant="body1" fontWeight="medium" mb={1}>
              Data da Agenda
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data da agenda"
                value={data}
                onChange={onDataChange}
                disablePast
                shouldDisableDate={ehFimDeSemana}
                sx={{ maxWidth: 400, width: '100%' }}
                slotProps={{
                  textField: {
                    helperText: "Apenas dias úteis (segunda a sexta-feira)"
                  }
                }}
              />
            </LocalizationProvider>
          </Box>
        )}
      </Box>
    </Paper>
  );
});

AgendaFilters.displayName = 'AgendaFilters';

export default AgendaFilters;
