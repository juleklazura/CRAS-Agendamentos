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
  MenuItem
} from '@mui/material';
import { motivosAtendimento } from '../../utils/agendamentoUtils';

export default function ModalEdicao({
  aberto,
  onFechar,
  onSalvar,
  dadosEdicao,
  setDadosEdicao
}) {
  return (
    <Dialog open={aberto} onClose={onFechar} maxWidth="sm" fullWidth>
      <DialogTitle>✏️ Editar Agendamento</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            margin="dense"
            label="👤 Nome Completo"
            value={dadosEdicao.pessoa}
            onChange={(e) => setDadosEdicao({ ...dadosEdicao, pessoa: e.target.value })}
            required
            placeholder="Digite o nome completo da pessoa"
            helperText="Nome da pessoa que será atendida"
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            margin="dense"
            label="📋 CPF"
            value={dadosEdicao.cpf}
            onChange={(e) => setDadosEdicao({ ...dadosEdicao, cpf: e.target.value })}
            required
            placeholder="Digite o CPF (000.000.000-00)"
            helperText="Digite apenas números, a formatação é automática"
            inputProps={{ maxLength: 14 }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            margin="dense"
            label="📞 Telefone Principal"
            value={dadosEdicao.telefone1}
            onChange={(e) => setDadosEdicao({ ...dadosEdicao, telefone1: e.target.value })}
            placeholder="Digite o telefone (00) 00000-0000"
            helperText="Número principal para contato"
            inputProps={{ maxLength: 15 }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            margin="dense"
            label="📞 Telefone Alternativo (Opcional)"
            value={dadosEdicao.telefone2}
            onChange={(e) => setDadosEdicao({ ...dadosEdicao, telefone2: e.target.value })}
            placeholder="Digite o telefone alternativo (00) 00000-0000"
            helperText="Número adicional (opcional)"
            inputProps={{ maxLength: 15 }}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>🎯 Motivo do atendimento</InputLabel>
            <Select
              value={dadosEdicao.motivo}
              onChange={(e) => setDadosEdicao({ ...dadosEdicao, motivo: e.target.value })}
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
            fullWidth
            margin="dense"
            label="📝 Observações (Opcional)"
            value={dadosEdicao.observacoes}
            onChange={(e) => setDadosEdicao({ ...dadosEdicao, observacoes: e.target.value })}
            multiline
            rows={3}
            placeholder="Digite observações adicionais (opcional)"
            helperText="Campo opcional para detalhes específicos"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onFechar} size="large">
          Cancelar
        </Button>
        <Button 
          onClick={onSalvar} 
          variant="contained" 
          size="large"
          disabled={!dadosEdicao.pessoa?.trim() || !dadosEdicao.cpf?.trim()}
        >
          Salvar Alterações
        </Button>
      </DialogActions>
    </Dialog>
  );
}
