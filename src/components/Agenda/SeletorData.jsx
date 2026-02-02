import { Box, Typography } from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';

export default function SeletorData({ data, setData }) {
  return (
    <Box sx={{ flex: 1, minWidth: 300 }}>
      <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>
        Data da Agenda
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
        <DatePicker
          label="Data da agenda"
          value={data}
          onChange={setData}
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
  );
}
