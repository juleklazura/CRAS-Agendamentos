import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatarCPF, formatarTelefone, motivosAtendimento } from '../../utils/agendamentoUtils';

export default function ModalAgendamento({
  aberto,
  onFechar,
  onSalvar,
  dadosAgendamento,
  setDadosAgendamento,
  horarioParaAgendamento,
  dataSelecionada,
  loading
}) {
  return (
    <Dialog open={aberto} onClose={onFechar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 2 }}>
        📅 Novo Agendamento
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {horarioParaAgendamento} • {dataSelecionada?.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="👤 Nome Completo"
            value={dadosAgendamento.pessoa}
            onChange={(e) => setDadosAgendamento({...dadosAgendamento, pessoa: e.target.value})}
            fullWidth
            required
            placeholder="Digite o nome completo da pessoa"
            helperText="Nome da pessoa que será atendida"
          />
          
          <TextField
            label="📋 CPF"
            value={dadosAgendamento.cpf}
            onChange={(e) => setDadosAgendamento({...dadosAgendamento, cpf: formatarCPF(e.target.value)})}
            fullWidth
            required
            placeholder="Digite o CPF (000.000.000-00)"
            helperText="Digite apenas números, a formatação é automática"
            inputProps={{ maxLength: 14 }}
          />
          
          <TextField
            label="📞 Telefone Principal"
            value={dadosAgendamento.telefone1}
            onChange={(e) => setDadosAgendamento({...dadosAgendamento, telefone1: formatarTelefone(e.target.value)})}
            fullWidth
            required
            placeholder="Digite o telefone (00) 00000-0000"
            helperText="Número principal para contato"
            inputProps={{ maxLength: 15 }}
          />
          
          <TextField
            label="📞 Telefone Alternativo (Opcional)"
            value={dadosAgendamento.telefone2}
            onChange={(e) => setDadosAgendamento({...dadosAgendamento, telefone2: formatarTelefone(e.target.value)})}
            fullWidth
            placeholder="Digite o telefone alternativo (00) 00000-0000"
            helperText="Número adicional (opcional)"
            inputProps={{ maxLength: 15 }}
          />
          
          <FormControl fullWidth required>
            <InputLabel>🎯 Motivo do atendimento</InputLabel>
            <Select
              value={dadosAgendamento.motivo}
              onChange={(e) => setDadosAgendamento({...dadosAgendamento, motivo: e.target.value})}
              label="🎯 Motivo do atendimento"
            >
              {motivosAtendimento.map((motivo) => (
                <MenuItem key={motivo} value={motivo}>
                  {motivo}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="📝 Observações (Opcional)"
            value={dadosAgendamento.observacoes}
            onChange={(e) => setDadosAgendamento({...dadosAgendamento, observacoes: e.target.value})}
            fullWidth
            multiline
            rows={3}
            placeholder="Digite observações adicionais (opcional)"
            helperText="Campo opcional para detalhes específicos"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onFechar} size="large">
          Cancelar
        </Button>
        <Button 
          onClick={onSalvar} 
          variant="contained"
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
        >
          {loading ? '💾 Salvando dados...' : 'Salvar Agendamento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
