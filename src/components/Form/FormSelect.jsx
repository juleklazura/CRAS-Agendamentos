/**
 * FormSelect - Componente Select reutilizável
 * 
 * Encapsula FormControl + Select + MenuItem do MUI
 * Padroniza selects em toda aplicação
 * 
 * @module FormSelect
 */

import {
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

export default function FormSelect({
  label,
  value,
  onChange,
  options = [],
  icon = '',
  required = false,
  sx = {},
  ...props
}) {
  return (
    <FormControl fullWidth margin="dense" sx={{ mb: 2, ...sx }}>
      <InputLabel>{icon ? `${icon} ${label}` : label}</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label={icon ? `${icon} ${label}` : label}
        required={required}
        {...props}
      >
        {options.map((option) => (
          <MenuItem 
            key={typeof option === 'string' ? option : option.value} 
            value={typeof option === 'string' ? option : option.value}
          >
            {typeof option === 'string' ? option : option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
