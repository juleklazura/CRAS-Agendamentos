import { Box, FormControl, InputLabel, Select, MenuItem, Typography, FormHelperText } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

export default function SeletorEntrevistador({
  entrevistadores,
  selectedEntrevistador,
  setSelectedEntrevistador,
  loading
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 300 }}>
      <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>
        Entrevistador
      </Typography>
      <FormControl sx={{ width: '100%' }} disabled={loading}>
        <InputLabel>Escolha o entrevistador</InputLabel>
        <Select
          value={selectedEntrevistador}
          onChange={(e) => setSelectedEntrevistador(e.target.value)}
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
        {selectedEntrevistador && (
          <FormHelperText>
            Visualizando agenda de: {entrevistadores.find(e => e._id === selectedEntrevistador)?.name}
          </FormHelperText>
        )}
      </FormControl>
    </Box>
  );
}
