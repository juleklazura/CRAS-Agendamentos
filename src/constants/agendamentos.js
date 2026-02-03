// Constantes do módulo de agendamentos
// Centralizadas para fácil manutenção e reutilização

/**
 * Opções de status disponíveis para agendamentos
 * Define todos os possíveis estados de um agendamento no sistema
 */
export const STATUS_OPTIONS = [
  { value: 'agendado', label: 'Agendado' },    // Status inicial após criação
  { value: 'realizado', label: 'Realizado' },  // Atendimento foi concluído
  { value: 'cancelado', label: 'Cancelado' },  // Cancelado pelo usuário/sistema
  { value: 'reagendar', label: 'Reagendar' },  // Precisa ser reagendado
  { value: 'faltou', label: 'Faltou' }         // Pessoa não compareceu
];

/**
 * Configurações de paginação padrão
 */
export const PAGINATION_CONFIG = {
  defaultRowsPerPage: 20,
  rowsPerPageOptions: [10, 20, 50, 100]
};

/**
 * Configurações de polling e atualização
 */
export const UPDATE_CONFIG = {
  pollingInterval: 30000,      // 30 segundos
  searchDebounceDelay: 500,    // 500ms
  visibilityChangeThrottle: 5000  // 5 segundos
};

/**
 * Mensagens de erro padrão
 */
export const ERROR_MESSAGES = {
  INVALID_ID: 'ID de agendamento inválido',
  DELETE_PERMISSION: '❌ Você só pode excluir seus próprios agendamentos',
  DELETE_CRAS_PERMISSION: '❌ Você só pode excluir agendamentos do seu CRAS',
  ACCESS_DENIED: '❌ Acesso negado',
  NOT_FOUND: '⚠️ Agendamento não encontrado',
  INVALID_DATA: '❌ Dados inválidos',
  DELETE_SUCCESS: 'Agendamento excluído com sucesso',
  EXPORT_SUCCESS: '✅ Dados exportados com sucesso'
};
