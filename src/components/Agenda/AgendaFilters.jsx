/**
 * AgendaFilters - Filtros em cascata: CRAS → Entrevistador → Data
 *
 * Para admin: seleção de CRAS é obrigatória como primeiro passo.
 *   1. Seleciona CRAS → carrega entrevistadores do CRAS.
 *   2. Seleciona entrevistador → exibe seletor de data.
 *   3. Seleciona data → tabela é renderizada.
 *
 * Para demais roles não-entrevistador (recepção): fluxo simplificado
 *   sem etapa de CRAS (filtro de CRAS já é implícito pelo vínculo do usuário).
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
import BusinessIcon from '@mui/icons-material/Business';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import ptBR from 'date-fns/locale/pt-BR';
import { ehFimDeSemana } from '../../utils/agendamentoUtils';

const AgendaFilters = memo(({ 
  crasList,
  selectedCras,
  onCrasChange,
  entrevistadores,
  selectedEntrevistador,
  onEntrevistadorChange,
  data,
  onDataChange,
  loading,
  isEntrevistador,
  isAdmin,
  allowPast
}) => {
  // Entrevistadores veem apenas sua própria agenda — filtros não aplicáveis.
  if (isEntrevistador) return null;

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1} mb={2}>
        <PersonIcon color="primary" />
        Seleções da Agenda
      </Typography>
      
      <Box display="flex" gap={3} alignItems="flex-start" flexWrap="wrap">

        {/* Passo 1 — Seleção de CRAS (somente admin) */}
        {isAdmin && (
          <Box sx={{ minWidth: 260, flex: 1 }}>
            <Typography variant="body1" fontWeight="medium" mb={1} display="flex" alignItems="center" gap={0.5}>
              <BusinessIcon fontSize="small" color="action" />
              Unidade CRAS
            </Typography>
            <FormControl fullWidth sx={{ maxWidth: 400 }}>
              <InputLabel>Escolha o CRAS</InputLabel>
              <Select
                value={selectedCras}
                label="Escolha o CRAS"
                onChange={(e) => onCrasChange(e.target.value)}
                disabled={loading}
              >
                <MenuItem value="">
                  <em>Selecione um CRAS</em>
                </MenuItem>
                {crasList.map((cras) => (
                  <MenuItem key={cras.id} value={cras.id}>
                    {cras.nome}
                  </MenuItem>
                ))}
              </Select>
              {selectedCras && (
                <FormHelperText>
                  CRAS selecionado: {crasList.find(c => c.id === selectedCras)?.nome}
                </FormHelperText>
              )}
            </FormControl>
          </Box>
        )}

        {/* Passo 2 — Seleção de entrevistador
            Para admin: aparece somente após selecionar CRAS.
            Para demais: sempre visível. */}
        {(!isAdmin || selectedCras) && (
          <Box sx={{ minWidth: 260, flex: 1 }}>
            <Typography variant="body1" fontWeight="medium" mb={1}>
              Entrevistador
            </Typography>
            <FormControl fullWidth sx={{ maxWidth: 400 }}>
              <InputLabel>Escolha o entrevistador</InputLabel>
              <Select
                value={selectedEntrevistador}
                label="Escolha o entrevistador"
                onChange={(e) => onEntrevistadorChange(e.target.value)}
                disabled={loading || (isAdmin && !selectedCras)}
              >
                <MenuItem value="">
                  <em>Selecione um entrevistador</em>
                </MenuItem>
                {entrevistadores.map((entrevistador) => (
                  <MenuItem key={entrevistador.id} value={entrevistador.id}>
                    {entrevistador.name}
                  </MenuItem>
                ))}
              </Select>
              {selectedEntrevistador && (
                <FormHelperText>
                  Visualizando agenda de: {entrevistadores.find(e => e.id === selectedEntrevistador)?.name}
                </FormHelperText>
              )}
            </FormControl>
          </Box>
        )}

        {/* Passo 3 — Seleção de data (aparece somente após selecionar entrevistador) */}
        {selectedEntrevistador && (
          <Box sx={{ minWidth: 260, flex: 1 }}>
            <Typography variant="body1" fontWeight="medium" mb={1}>
              Data da Agenda
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data da agenda"
                value={data}
                onChange={onDataChange}
                {...(!allowPast && { disablePast: true })}
                shouldDisableDate={ehFimDeSemana}
                sx={{ maxWidth: 400, width: '100%' }}
                slotProps={{
                  textField: {
                    helperText: allowPast
                      ? "Apenas dias úteis (segunda a sexta-feira)"
                      : "Apenas dias úteis a partir de hoje"
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
