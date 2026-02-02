/**
 * FormTextField - Campo de texto reutilizável com formatação
 * 
 * Componente que encapsula TextField do MUI com:
 * - Formatação automática de valores (CPF, telefone, etc)
 * - Validação integrada
 * - Props consistentes em toda aplicação
 * 
 * @module FormTextField
 */

import { TextField } from '@mui/material';

export default function FormTextField({
  label,
  value,
  onChange,
  formatter,
  required = false,
  maxLength,
  multiline = false,
  rows = 1,
  icon = '',
  sx = {},
  ...props
}) {
  const handleChange = (e) => {
    const newValue = formatter ? formatter(e.target.value) : e.target.value;
    onChange(newValue);
  };

  return (
    <TextField
      fullWidth
      margin="dense"
      label={icon ? `${icon} ${label}` : label}
      value={value}
      onChange={handleChange}
      required={required}
      multiline={multiline}
      rows={multiline ? rows : undefined}
      inputProps={maxLength ? { maxLength } : undefined}
      sx={{ mb: 2, ...sx }}
      {...props}
    />
  );
}
