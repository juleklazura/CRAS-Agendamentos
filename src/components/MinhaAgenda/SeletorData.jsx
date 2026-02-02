import { Box, Card, CardContent } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

export default function SeletorData({ dataSelecionada, onChange }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
      <Card sx={{ minWidth: 300, maxWidth: 400 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <DatePicker
              label="Selecionar Data"
              value={dataSelecionada}
              onChange={onChange}
              shouldDisableDate={(date) => {
                const day = date.getDay();
                return day === 0 || day === 6; // Desabilitar fins de semana
              }}
              slotProps={{
                textField: { size: 'small' }
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
