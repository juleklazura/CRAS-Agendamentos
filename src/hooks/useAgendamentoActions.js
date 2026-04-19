/**
 * Hook de Ações de Agendamentos
 * Responsabilidade: Lógica de exportação, auditoria e autorização
 * Separado do componente para melhor testabilidade
 */
import { useCallback } from 'react';
import { exportToCSV } from '../utils/csvExport';
import { STATUS_OPTIONS } from '../constants/agendamentos';
import { sanitizeText, maskCPF, maskPhone, truncateText } from '../utils/formatters';
import api from '../services/api';

/**
 * Registra auditoria de exportação no backend (LGPD — rastreabilidade server-side).
 * Falhas silenciosas: a exportação não deve ser bloqueada por falha de log.
 */
const registrarAuditoria = async (user, quantidade) => {
  try {
    await api.post('/logs', {
      action: 'exportar_agendamentos',
      details: `Exportação de ${quantidade} agendamento(s) para CSV por ${user?.name} (${user?.role})`,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Falha ao registrar auditoria de exportação:', error);
    }
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
      // Registra auditoria server-side (LGPD)
      await registrarAuditoria(user, agendamentos.length);
      
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
