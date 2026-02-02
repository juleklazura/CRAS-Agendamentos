import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { motivosAtendimento } from '../../utils/agendamentoUtils';

export default function ModalAgendamento({ 
  open, 
  onClose, 
  dadosAgendamento, 
  setDadosAgendamento,
  horarioSelecionado,
  dataSelecionada,
  onCriar,
  loading,
  onCPFChange,
  onTelefoneChange
}) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Criar Agendamento - {horarioSelecionado} em {dataSelecionada?.toLocaleDateString('pt-BR')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="👤 Nome Completo"
            value={dadosAgendamento.pessoa}
            onChange={(e) => setDadosAgendamento(prev => ({ ...prev, pessoa: e.target.value }))}
            fullWidth
            required
            placeholder="Digite o nome completo da pessoa"
            helperText="Nome da pessoa que será atendida"
          />
          <TextField
            label="📋 CPF"
            value={dadosAgendamento.cpf}
            onChange={(e) => onCPFChange(e.target.value)}
            fullWidth
            required
            placeholder="Digite o CPF (000.000.000-00)"
            helperText="Digite apenas números, a formatação é automática"
            inputProps={{ maxLength: 14 }}
          />
          <TextField
            label="📞 Telefone Principal"
            value={dadosAgendamento.telefone1}
            onChange={(e) => onTelefoneChange(e.target.value, 'telefone1')}
            fullWidth
            required
            placeholder="Digite o telefone (00) 00000-0000"
            helperText="Número principal para contato"
            inputProps={{ maxLength: 15 }}
          />
          <TextField
            label="📞 Telefone Alternativo (Opcional)"
            value={dadosAgendamento.telefone2}
            onChange={(e) => onTelefoneChange(e.target.value, 'telefone2')}
            fullWidth
            placeholder="Digite o telefone alternativo (00) 00000-0000"
            helperText="Número adicional (opcional)"
            inputProps={{ maxLength: 15 }}
          />
          <FormControl fullWidth required>
            <InputLabel>🎯 Motivo do atendimento</InputLabel>
            <Select
              value={dadosAgendamento.motivo}
              onChange={(e) => setDadosAgendamento(prev => ({ ...prev, motivo: e.target.value }))}
              label="🎯 Motivo do atendimento"
              MenuProps={{
                disableRestoreFocus: true,
                disableAutoFocus: true
              }}
            >
              {motivosAtendimento.map(motivo => (
                <MenuItem key={motivo} value={motivo}>
                  {motivo}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="📝 Observações (Opcional)"
            value={dadosAgendamento.observacoes}
            onChange={(e) => setDadosAgendamento(prev => ({ ...prev, observacoes: e.target.value }))}
            fullWidth
            multiline
            rows={3}
            placeholder="Digite observações adicionais (opcional)"
            helperText="Campo opcional para detalhes específicos"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={onCriar} 
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
        >
          {loading ? '💾 Criando...' : 'Criar Agendamento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
