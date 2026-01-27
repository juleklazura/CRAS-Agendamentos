import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Paper
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PersonIcon from '@mui/icons-material/Person';
import ptBR from 'date-fns/locale/pt-BR';

export default function SeletorEntrevistador({
  entrevistadores,
  entrevistadorSelecionado,
  setEntrevistadorSelecionado,
  dataSelecionada,
  setDataSelecionada,
  crasInfo,
  usuario
}) {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, width: '100%', maxWidth: 'none' }} className="agenda-selectors">
      <Box sx={{ mb: 3 }}>
        {entrevistadores.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <PersonIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
            <Typography color="warning.main" variant="body1" sx={{ mb: 1 }}>
              Nenhum entrevistador encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Verifique se existem entrevistadores cadastrados para o CRAS: {crasInfo?.nome || usuario?.cras}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Seleção do Entrevistador */}
            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Typography variant="body1" fontWeight="medium" sx={{ mb: 1, textAlign: 'left' }}>
                Entrevistador
              </Typography>
              <FormControl sx={{ width: '100%' }}>
                <InputLabel>Escolha o entrevistador</InputLabel>
                <Select
                  value={entrevistadorSelecionado}
                  onChange={(e) => setEntrevistadorSelecionado(e.target.value)}
                  label="Escolha o entrevistador"
                >
                  {entrevistadores.map((entrevistador) => (
                    <MenuItem key={entrevistador._id} value={entrevistador._id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonIcon fontSize="small" color="primary" />
                        {entrevistador.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {entrevistadorSelecionado && (
                  <FormHelperText>
                    Visualizando agenda de: {entrevistadores.find(e => e._id === entrevistadorSelecionado)?.name}
                  </FormHelperText>
                )}
              </FormControl>
            </Box>

            {/* Seleção da Data */}
            {entrevistadorSelecionado && (
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <Typography variant="body1" fontWeight="medium" sx={{ mb: 1, textAlign: 'left' }}>
                  Data da Agenda
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <DatePicker
                    label="Data da agenda"
                    value={dataSelecionada}
                    onChange={setDataSelecionada}
                    minDate={new Date()}
                    shouldDisableDate={(data) => data.getDay() === 0 || data.getDay() === 6}
                    slotProps={{
                      textField: {
                        helperText: 'Apenas dias úteis (segunda a sexta-feira)',
                        sx: { width: '100%' }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
