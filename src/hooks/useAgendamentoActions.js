/**
 * Hook de Ações de Agendamentos
 * Responsabilidade: Lógica de exportação, auditoria e autorização
 * Separado do componente para melhor testabilidade
 */
import { useCallback } from 'react';
import { exportToCSV } from '../utils/csvExport';
import { STATUS_OPTIONS } from '../constants/agendamentos';
import { sanitizeText, maskCPF, maskPhone, truncateText } from '../utils/formatters';

/**
 * Registra auditoria localmente
 * Mantém últimas 100 auditorias no localStorage
 */
const registrarAuditoria = (auditLog) => {
  try {
    const auditorias = JSON.parse(localStorage.getItem('auditorias') || '[]');
    auditorias.push(auditLog);
    
    // Mantém apenas últimas 100 auditorias
    const ultimasAuditorias = auditorias.slice(-100);
    localStorage.setItem('auditorias', JSON.stringify(ultimasAuditorias));
    
    if (import.meta.env.DEV) {
      console.info('📋 Auditoria registrada:', auditLog);
    }
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
};

/**
 * Verifica se usuário pode deletar agendamento
 * Memoizado para evitar recriação
 */
export const canDeleteAgendamento = (agendamento, user) => {
  if (!user || !agendamento) return false;
  return user.role === 'admin' || 
         user.id === agendamento.createdBy?.id ||
         user.id === agendamento.entrevistador?.id;
};

/**
 * Hook de ações de agendamentos
 */
export function useAgendamentoActions(user, agendamentos) {
  /**
   * Exporta agendamentos para CSV com auditoria
   */
  const handleExport = useCallback(async () => {
    try {
      // Registra auditoria
      const auditLog = {
        acao: 'EXPORTACAO_AGENDAMENTOS',
        usuario: user?.id,
        usuarioNome: user?.name,
        quantidadeRegistros: agendamentos.length,
        timestamp: new Date().toISOString()
      };
      
      registrarAuditoria(auditLog);
      
      // Prepara dados com mascaramento LGPD
      const data = agendamentos.map(a => ({
        Entrevistador: sanitizeText(a.entrevistador?.name),
        CRAS: sanitizeText(a.cras?.nome),
        Nome: sanitizeText(a.pessoa),
        CPF: maskCPF(a.cpf),
        'Telefone 1': maskPhone(a.telefone1),
        'Telefone 2': maskPhone(a.telefone2),
        Motivo: sanitizeText(a.motivo),
        'Data/Hora': new Date(a.data).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        Status: STATUS_OPTIONS.find(s => s.value === a.status)?.label || a.status,
        'Criado Por': sanitizeText(a.createdBy?.name),
        Observações: truncateText(a.observacoes, 100)
      }));
      
      const filename = `agendamentos_${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(data, filename);
      
      return { success: true };
    } catch (error) {
      // Tratamento de erros específicos
      const errorMessages = {
        413: 'Muitos registros para exportar. Aplique filtros e tente novamente.',
        403: 'Você não tem permissão para exportar dados.',
        500: 'Erro no servidor. Tente novamente em alguns instantes.'
      };
      
      const message = errorMessages[error.response?.status] || 
                     'Erro ao exportar dados. Tente novamente.';
      
      return { success: false, error: message };
    }
  }, [user, agendamentos]);

  /**
   * Verifica permissão de deleção (memoizado)
   */
  const canDelete = useCallback((agendamento) => {
    return canDeleteAgendamento(agendamento, user);
  }, [user]);

  return {
    handleExport,
    canDelete
  };
}
