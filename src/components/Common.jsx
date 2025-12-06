/**
 * ========================================
 * BIBLIOTECA DE COMPONENTES REUTILIZÁVEIS
 * ========================================
 * 
 * Este arquivo centraliza componentes UI comuns usados em todo o sistema.
 * Todos os componentes são otimizados com React.memo para evitar re-renders desnecessários.
 * 
 * COMPONENTES DISPONÍVEIS:
 * - NotificationSnackbar: Mensagens de feedback (sucesso/erro/aviso)
 * - GlobalLoader: Indicador de carregamento global com backdrop
 * - ConfirmDialog: Modal de confirmação para ações críticas
 * - PageContainer: Container padrão para páginas com responsividade
 * - InfoCard: Card estilizado para exibir informações
 * - StatusIndicator: Indicador visual de status com cores
 * - EmptyState: Estado vazio com mensagem e ícone
 * 
 * VANTAGENS DA CENTRALIZAÇÃO:
 * - Consistência visual em toda a aplicação
 * - Facilita manutenção (mudanças em um único lugar)
 * - Reduz duplicação de código
 * - Garante acessibilidade e boas práticas
 * - Performance otimizada com memoização
 * 
 * OTIMIZAÇÕES APLICADAS:
 * - Todos os componentes usam React.memo
 * - Props desestruturadas para evitar re-renders
 * - DisplayName definido para melhor debugging
 * - Default props para propriedades opcionais
 * 
 * @module Common
 * @requires React
 * @requires @mui/material
 */

import React, { memo } from 'react';
import {
  Snackbar,
  Alert,
  CircularProgress,
  Box,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';

/**
 * 🔔 NotificationSnackbar - Sistema de Notificações Toast
 * 
 * Exibe mensagens de feedback temporárias no canto superior direito da tela.
 * Auto-oculta após duração configurável e permite fechamento manual.
 * Suporta 4 níveis de severidade com cores e ícones distintos.
 * 
 * CASOS DE USO:
 * - Confirmação de operações bem-sucedidas
 * - Avisos de erros de validação
 * - Alertas importantes para o usuário
 * - Mensagens informativas temporárias
 * 
 * NÍVEIS DE SEVERIDADE:
 * - success: Verde - operações bem-sucedidas
 * - error: Vermelho - erros e falhas
 * - warning: Laranja - avisos importantes
 * - info: Azul - informações gerais
 * 
 * @component
 * @param {boolean} open - Controla visibilidade da notificação
 * @param {string} message - Texto da mensagem a ser exibida
 * @param {string} [severity='info'] - Tipo da notificação (success/error/warning/info)
 * @param {Function} onClose - Callback executada ao fechar notificação
 * @param {number} [autoHideDuration=6000] - Tempo em ms antes de ocultar automaticamente
 * 
 * @example
 * // Exemplo de uso com notificação de sucesso
 * <NotificationSnackbar
 *   open={showSuccess}
 *   message="Agendamento criado com sucesso!"
 *   severity="success"
 *   onClose={() => setShowSuccess(false)}
 *   autoHideDuration={4000}
 * />
 * 
 * @example
 * // Exemplo de uso com notificação de erro
 * <NotificationSnackbar
 *   open={hasError}
 *   message="CPF inválido. Verifique os dados."
 *   severity="error"
 *   onClose={handleCloseError}
 * />
 */
export const NotificationSnackbar = memo(({ 
  open, 
  message, 
  severity = 'info', 
  onClose,
  autoHideDuration = 6000 
}) => {
  // Handler que ignora cliques fora do snackbar
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return; // Não fecha ao clicar fora
    onClose?.(event, reason);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ mb: 2, mr: 2 }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
});

NotificationSnackbar.displayName = 'NotificationSnackbar';

/**
 * ⏳ GlobalLoader - Indicador de Carregamento Global
 * 
 * Exibe spinner centralizado com backdrop que bloqueia interações na página.
 * Usado para operações assíncronas longas que exigem feedback visual claro.
 * Previne cliques acidentais enquanto aguarda conclusão de operações.
 * 
 * CASOS DE USO:
 * - Salvamento de dados no servidor
 * - Carregamento inicial de páginas
 * - Processamento de arquivos
 * - Operações que exigem bloqueio de UI
 * 
 * FUNCIONALIDADES:
 * - Spinner animado com Material-UI
 * - Backdrop semi-transparente escuro
 * - Mensagem customizável abaixo do spinner
 * - Z-index elevado para sobrepor todos elementos
 * 
 * @component
 * @param {boolean} open - Controla visibilidade do loader
 * @param {string} [message='Carregando...'] - Texto exibido abaixo do spinner
 * 
 * @example
 * // Exemplo básico com mensagem padrão
 * <GlobalLoader open={isLoading} />
 * 
 * @example
 * // Com mensagem customizada
 * <GlobalLoader 
 *   open={isSaving} 
 *   message="Salvando agendamento..." 
 * />
 * 
 * @example
 * // Uso com estado async
 * const [loading, setLoading] = useState(false);
 * 
 * const saveData = async () => {
 *   setLoading(true);
 *   try {
 *     await api.saveAppointment(data);
 *   } finally {
 *     setLoading(false);
 *   }
 * };
 * 
 * return <GlobalLoader open={loading} message="Processando..." />;
 */
export const GlobalLoader = memo(({ open, message = 'Carregando...' }) => (
  <Backdrop
    sx={{ 
      color: '#fff', 
      zIndex: (theme) => theme.zIndex.drawer + 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}
    open={open}
  >
    <CircularProgress color="inherit" size={60} />
    <Typography variant="h6" component="div">
      {message}
    </Typography>
  </Backdrop>
));

GlobalLoader.displayName = 'GlobalLoader';

/**
 * ❓ ConfirmDialog - Modal de Confirmação para Ações Críticas
 * 
 * Modal reutilizável para solicitar confirmação antes de executar ações importantes.
 * Reduz erros de usuário e previne perda acidental de dados.
 * Design adaptado ao nível de severidade da ação.
 * 
 * CASOS DE USO:
 * - Exclusão de registros (severity: error)
 * - Cancelamento de agendamentos (severity: warning)
 * - Alterações irreversíveis (severity: warning)
 * - Confirmações importantes (severity: info)
 * 
 * NÍVEIS DE SEVERIDADE:
 * - error: Vermelho - ações destrutivas (excluir, remover)
 * - warning: Laranja - ações com consequências (cancelar, bloquear)
 * - info: Azul - ações informativas (confirmar, continuar)
 * 
 * ACESSIBILIDADE:
 * - Botão de confirmação com autoFocus
 * - Tecla ESC fecha o modal
 * - Suporte a navegação por teclado
 * 
 * @component
 * @param {boolean} open - Controla visibilidade do modal
 * @param {string} title - Título do modal (ex: "Confirmar Exclusão")
 * @param {string} message - Mensagem detalhada da ação
 * @param {string} [confirmText='Confirmar'] - Texto do botão de confirmação
 * @param {string} [cancelText='Cancelar'] - Texto do botão de cancelamento
 * @param {Function} onConfirm - Callback executada ao confirmar
 * @param {Function} onCancel - Callback executada ao cancelar
 * @param {string} [severity='warning'] - Nível de severidade (error/warning/info)
 * 
 * @example
 * // Confirmação de exclusão (crítica)
 * <ConfirmDialog
 *   open={showDelete}
 *   title="Excluir Agendamento"
 *   message="Esta ação não pode ser desfeita. Deseja realmente excluir?"
 *   severity="error"
 *   confirmText="Sim, Excluir"
 *   cancelText="Cancelar"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDelete(false)}
 * />
 * 
 * @example
 * // Confirmação de cancelamento
 * <ConfirmDialog
 *   open={showCancel}
 *   title="Cancelar Agendamento"
 *   message="O cidadão será notificado sobre o cancelamento. Confirma?"
 *   severity="warning"
 *   onConfirm={handleCancel}
 *   onCancel={() => setShowCancel(false)}
 * />
 */
export const ConfirmDialog = memo(({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  severity = 'warning'
}) => {
  const getSeverityColor = () => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'primary';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={onCancel}
          variant="outlined"
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={getSeverityColor()}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

ConfirmDialog.displayName = 'ConfirmDialog';

/**
 * 🎯 PageContainer - Container Padrão para Páginas
 * 
 * Fornece estrutura consistente para todas as páginas da aplicação.
 * Gerencia responsividade, padding e largura máxima automaticamente.
 * Aplica estilo de fundo e centralização de conteúdo.
 * 
 * BENEFÍCIOS:
 * - Layout consistente em todas as páginas
 * - Responsividade automática
 * - Títulos de página padronizados
 * - Espaçamento uniforme
 * 
 * LARGURAS DISPONÍVEIS:
 * - 'xs': 444px - formulários pequenos
 * - 'sm': 600px - formulários médios
 * - 'md': 900px - dashboards compactos
 * - 'lg': 1200px - páginas padrão
 * - 'xl': 1536px - páginas amplas (padrão)
 * - 'full': 100% - páginas de largura total
 * 
 * @component
 * @param {ReactNode} children - Conteúdo da página
 * @param {string} [title] - Título da página (opcional)
 * @param {string} [maxWidth='xl'] - Largura máxima do container
 * 
 * @example
 * // Container básico sem título
 * <PageContainer>
 *   <p>Conteúdo da página</p>
 * </PageContainer>
 * 
 * @example
 * // Container com título e largura customizada
 * <PageContainer title="Gerenciar Agendamentos" maxWidth="lg">
 *   <AgendamentosList />
 * </PageContainer>
 * 
 * @example
 * // Container de largura total para dashboards
 * <PageContainer title="Dashboard" maxWidth="full">
 *   <Dashboard />
 * </PageContainer>
 */
export const PageContainer = memo(({ children, title, maxWidth = 'xl' }) => (
  <Box
    component="main"
    sx={{
      flexGrow: 1,
      p: 3,
      minHeight: '100vh',
      backgroundColor: 'grey.50'
    }}
  >
    <Box 
      sx={{ 
        maxWidth: maxWidth === 'full' ? '100%' : `${maxWidth}.main`,
        mx: 'auto'
      }}
    >
      {title && (
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            color: 'primary.main',
            mb: 3
          }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  </Box>
));

PageContainer.displayName = 'PageContainer';

/**
 * 📝 InfoCard - Card de Informações Estilizado
 * 
 * Componente de card reutilizável para exibir blocos de conteúdo.
 * Suporta título, ações no cabeçalho e conteúdo customizado.
 * Estilo consistente com elevação e bordas arredondadas.
 * 
 * CASOS DE USO:
 * - Formulários de cadastro
 * - Exibição de detalhes de registro
 * - Blocos de estatísticas
 * - Seções de conteúdo organizadas
 * 
 * FUNCIONALIDADES:
 * - Título opcional no cabeçalho
 * - Ações (botões/ícones) no canto superior direito
 * - Elevação configurável (sombra)
 * - Estilos customizáveis via prop sx
 * 
 * @component
 * @param {string} [title] - Título exibido no cabeçalho
 * @param {ReactNode} children - Conteúdo principal do card
 * @param {ReactNode} [actions] - Botões/ícones para o cabeçalho
 * @param {number} [elevation=1] - Nível de elevação (0-24)
 * @param {Object} [sx={}] - Estilos customizados do Material-UI
 * 
 * @example
 * // Card simples sem título
 * <InfoCard>
 *   <p>Conteúdo do card</p>
 * </InfoCard>
 * 
 * @example
 * // Card com título e ações
 * <InfoCard 
 *   title="Dados do Agendamento"
 *   actions={
 *     <>
 *       <IconButton><Edit /></IconButton>
 *       <IconButton><Delete /></IconButton>
 *     </>
 *   }
 * >
 *   <FormularioAgendamento />
 * </InfoCard>
 * 
 * @example
 * // Card com elevação e estilos customizados
 * <InfoCard 
 *   title="Estatísticas"
 *   elevation={3}
 *   sx={{ backgroundColor: '#f5f5f5' }}
 * >
 *   <Estatisticas />
 * </InfoCard>
 */
export const InfoCard = memo(({ 
  title, 
  children, 
  actions,
  elevation = 1,
  sx = {} 
}) => (
  <Box
    sx={{
      backgroundColor: 'white',
      borderRadius: 2,
      boxShadow: elevation,
      p: 3,
      ...sx
    }}
  >
    {title && (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2,
        pb: 1,
        borderBottom: '1px solid',
        borderColor: 'grey.200'
      }}>
        <Typography 
          variant="h6" 
          component="h2"
          sx={{ fontWeight: 'medium' }}
        >
          {title}
        </Typography>
        {actions && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {actions}
          </Box>
        )}
      </Box>
    )}
    {children}
  </Box>
));

InfoCard.displayName = 'InfoCard';

/**
 * 📊 StatusIndicator - Indicador Visual de Status
 * 
 * Exibe status com cor e label correspondente ao estado.
 * Usado para representar visualmente o estado de agendamentos ou horários.
 * Consistência de cores em toda a aplicação.
 * 
 * STATUS SUPORTADOS:
 * - livre: Verde - horário disponível para agendamento
 * - agendado: Azul - horário já agendado
 * - realizado: Verde - atendimento já realizado
 * - bloqueado: Laranja - horário bloqueado pelo sistema
 * - cancelado: Vermelho - agendamento cancelado
 * 
 * TAMANHOS:
 * - small: Indicador de 8px (padrão)
 * - large: Indicador de 12px (destaque)
 * 
 * @component
 * @param {string} status - Status a ser exibido (livre/agendado/realizado/bloqueado/cancelado)
 * @param {string} [size='small'] - Tamanho do indicador (small/large)
 * @param {boolean} [showLabel=true] - Mostrar ou ocultar o texto do label
 * 
 * @example
 * // Indicador básico com label
 * <StatusIndicator status="agendado" />
 * 
 * @example
 * // Indicador grande apenas visual
 * <StatusIndicator 
 *   status="realizado" 
 *   size="large" 
 *   showLabel={false} 
 * />
 * 
 * @example
 * // Uso em lista de agendamentos
 * {agendamentos.map(agendamento => (
 *   <ListItem key={agendamento.id}>
 *     <StatusIndicator status={agendamento.status} />
 *     <ListItemText primary={agendamento.nome} />
 *   </ListItem>
 * ))}
 */
export const StatusIndicator = memo(({ 
  status, 
  size = 'small',
  showLabel = true 
}) => {
  const getStatusConfig = () => {
    const configs = {
      'livre': { color: '#4caf50', label: 'Disponível' },
      'agendado': { color: '#2196f3', label: 'Agendado' },
      'realizado': { color: '#4caf50', label: 'Realizado' },
      'bloqueado': { color: '#ff9800', label: 'Bloqueado' },
      'cancelado': { color: '#f44336', label: 'Cancelado' }
    };
    
    return configs[status] || { color: '#9e9e9e', label: 'Indefinido' };
  };

  const config = getStatusConfig();
  const dotSize = size === 'large' ? 12 : 8;

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1 
    }}>
      <Box
        sx={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: config.color,
          flexShrink: 0
        }}
      />
      {showLabel && (
        <Typography 
          variant={size === 'large' ? 'body1' : 'body2'}
          sx={{ color: 'text.secondary' }}
        >
          {config.label}
        </Typography>
      )}
    </Box>
  );
});

StatusIndicator.displayName = 'StatusIndicator';

/**
 * 🔄 EmptyState - Estado Vazio com Mensagem
 * 
 * Componente para exibir quando não há dados disponíveis.
 * Melhora UX mostrando mensagem clara ao invés de área em branco.
 * Suporta ícone customizado e ação (botão) opcional.
 * 
 * CASOS DE USO:
 * - Lista de agendamentos vazia
 * - Busca sem resultados
 * - Primeira utilização de funcionalidade
 * - Filtros que não retornam dados
 * 
 * BENEFÍCIOS UX:
 * - Evita confusão com telas em branco
 * - Orienta usuário sobre próximos passos
 * - Permite ação direta (ex: "Criar novo")
 * - Visual agradável e profissional
 * 
 * @component
 * @param {string} [message='Nenhum item encontrado'] - Mensagem a ser exibida
 * @param {Component} [icon] - Componente de ícone do Material-UI
 * @param {ReactNode} [action] - Botão ou ação opcional (ex: "Criar Novo")
 * 
 * @example
 * // Estado vazio básico
 * <EmptyState message="Nenhum agendamento encontrado" />
 * 
 * @example
 * // Com ícone e botão de ação
 * <EmptyState 
 *   message="Nenhum agendamento para este período"
 *   icon={EventBusyIcon}
 *   action={
 *     <Button 
 *       variant="contained" 
 *       onClick={handleCreateNew}
 *     >
 *       Criar Novo Agendamento
 *     </Button>
 *   }
 * />
 * 
 * @example
 * // Uso condicional em listas
 * {agendamentos.length === 0 ? (
 *   <EmptyState 
 *     message="Você ainda não tem agendamentos"
 *     icon={CalendarIcon}
 *   />
 * ) : (
 *   <AgendamentosList agendamentos={agendamentos} />
 * )}
 */
export const EmptyState = memo(({ 
  message = 'Nenhum item encontrado',
  icon: Icon,
  action
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 4,
      textAlign: 'center',
      minHeight: 200
    }}
  >
    {Icon && (
      <Icon 
        sx={{ 
          fontSize: 64, 
          color: 'grey.400',
          mb: 2 
        }} 
      />
    )}
    <Typography 
      variant="h6" 
      sx={{ 
        color: 'grey.600',
        mb: 1
      }}
    >
      {message}
    </Typography>
    {action}
  </Box>
));

EmptyState.displayName = 'EmptyState';
