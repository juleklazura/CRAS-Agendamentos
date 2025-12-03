// Utilitários centralizados do Sistema de Agendamentos CRAS
// Centraliza todas as funções comuns para melhor manutenção e consistência

/**
 * Formata CPF para exibição amigável
 * Transforma números em formato legível: 000.000.000-00
 * @param {string} valor - CPF em formato numérico
 * @returns {string} CPF formatado
 */
export const formatarCPF = (valor) => {
  if (!valor) return '';
  const apenasNumeros = valor.replace(/\D/g, '').slice(0, 11);
  return apenasNumeros
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2');
};

/**
 * Formata telefone para exibição amigável
 * Adapta automaticamente para telefone fixo ou celular
 * @param {string} valor - Telefone em formato numérico
 * @returns {string} Telefone formatado
 */
export const formatarTelefone = (valor) => {
  if (!valor) return '';
  const apenasNumeros = valor.replace(/\D/g, '').slice(0, 11);
  
  if (apenasNumeros.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return apenasNumeros
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    // Celular: (00) 00000-0000
    return apenasNumeros
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
};

/**
 * Exibe CPF formatado de forma inteligente
 * Verifica se já está formatado antes de aplicar formatação
 * @param {string} cpf - CPF para exibição
 * @returns {string} CPF formatado ou traço se vazio
 */
export const exibirCPFFormatado = (cpf) => {
  if (!cpf) return '-';
  // Se já está formatado, mantém como está
  if (cpf.includes('.')) return cpf;
  // Aplica formatação se necessário
  return formatarCPF(cpf);
};

/**
 * 📞 Exibe telefone formatado de forma inteligente
 */
export const exibirTelefoneFormatado = (telefone) => {
  if (!telefone) return '-';
  // Se já está formatado, mantém como está
  if (telefone.includes('(')) return telefone;
  // Aplica formatação se necessário
  return formatarTelefone(telefone);
};

/**
 * ✅ Valida CPF com mensagens humanizadas
 * Retorna objeto com status e mensagem amigável
 */
export const validarCPF = (cpf) => {
  if (!cpf?.trim()) {
    return { 
      valido: false, 
      mensagem: 'É necessário informar o CPF do cidadão' 
    };
  }

  const apenasNumeros = cpf.replace(/\D/g, '');
  
  if (apenasNumeros.length !== 11) {
    return { 
      valido: false, 
      mensagem: 'CPF deve conter exatamente 11 dígitos' 
    };
  }

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(apenasNumeros)) {
    return { 
      valido: false, 
      mensagem: 'CPF inválido. Verifique os números digitados' 
    };
  }

  // Validação dos dígitos verificadores
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(apenasNumeros.charAt(i)) * (10 - i);
  }
  const digito1 = (soma * 10) % 11;
  const resultado1 = digito1 === 10 ? 0 : digito1;
  
  if (parseInt(apenasNumeros.charAt(9)) !== resultado1) {
    return { 
      valido: false, 
      mensagem: 'CPF inválido. Verifique os números digitados' 
    };
  }

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(apenasNumeros.charAt(i)) * (11 - i);
  }
  const digito2 = (soma * 10) % 11;
  const resultado2 = digito2 === 10 ? 0 : digito2;
  
  if (parseInt(apenasNumeros.charAt(10)) !== resultado2) {
    return { 
      valido: false, 
      mensagem: 'CPF inválido. Verifique os números digitados' 
    };
  }
  
  return { valido: true, mensagem: '' };
};

/**
 * 📞 Valida telefone com mensagens humanizadas
 */
export const validarTelefone = (telefone) => {
  if (!telefone?.trim()) {
    return { 
      valido: false, 
      mensagem: 'É necessário informar um telefone para contato' 
    };
  }
  
  const apenasNumeros = telefone.replace(/\D/g, '');
  if (apenasNumeros.length < 10) {
    return { 
      valido: false, 
      mensagem: 'Telefone deve ter pelo menos 10 dígitos com DDD' 
    };
  }
  
  return { valido: true, mensagem: '' };
};

/**
 * 📅 Lista de motivos para atendimento - APENAS OS 4 MOTIVOS OFICIAIS
 * Definidos conforme especificação do CRAS
 */
export const motivosAtendimento = [
  'Atualização Cadastral',
  'Inclusão',
  'Transferência de Município',
  'Orientações Gerais'
];

/**
 * ⏰ Horários disponíveis - CRAS funciona das 8h30 às 17h
 * Lista corrigida - Início às 08:30 (não 08:00)
 */
export const horariosDisponiveis = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

/**
 * 💬 Mensagens humanizadas do sistema
 * Todas as mensagens de feedback, erro e sucesso em linguagem amigável
 */
export const mensagens = {
  // ✅ Mensagens de sucesso
  sucesso: {
    agendamentoCriado: 'Agendamento criado com sucesso',
    agendamentoEditado: 'Agendamento atualizado com sucesso',
    agendamentoCancelado: 'Agendamento cancelado com sucesso',
    horarioBloqueado: '🚫 Horário bloqueado com sucesso.',
    horarioDesbloqueado: '✅ Horário liberado com sucesso.',
    dadosSalvos: '💾 Dados salvos com sucesso!',
    presencaConfirmada: '✅ Presença confirmada com sucesso!',
    presencaRemovida: '🔄 Confirmação de presença removida com sucesso!'
  },

  // ❌ Mensagens de erro
  erro: {
    camposObrigatorios: '⚠️ Por favor, preencha todos os campos obrigatórios.',
    cpfInvalido: '📋 CPF inválido. Verifique os números digitados.',
    telefoneInvalido: '📞 Telefone inválido. Use o formato (00) 00000-0000.',
    horarioIndisponivel: '⏰ Este horário não está mais disponível. Escolha outro horário.',
    dataPassada: '📅 Não é possível agendar para datas passadas.',
    finaisDeSemana: '📅 Agendamentos não são permitidos aos finais de semana.',
    limiteAgendamentos: '📊 Limite de agendamentos atingido para este horário.',
    conexaoFalhou: '🌐 Erro de conexão. Verifique sua internet e tente novamente.',
    permissaoNegada: '🔒 Você não tem permissão para realizar esta ação.',
    dadosNaoEncontrados: '🔍 Dados não encontrados.',
    erroInesperado: '😓 Ops! Algo deu errado. Tente novamente em alguns instantes.',
    agendamentoInvalido: '❌ Agendamento inválido ou não encontrado.',
    falhaConfirmacao: '❌ Erro ao confirmar presença. Tente novamente.'
  },

  // ⚠️ Mensagens de confirmação
  confirmacao: {
    cancelarAgendamento: 'Tem certeza que deseja cancelar este agendamento?',
    bloquearHorario: 'Deseja realmente bloquear este horário?',
    desbloquearHorario: 'Deseja liberar este horário para agendamentos?',
    excluirDados: 'Esta ação não pode ser desfeita. Confirma a exclusão?',
    sairSemSalvar: 'Existem alterações não salvas. Deseja sair mesmo assim?',
    confirmarPresenca: 'Confirmar a presença do cidadão para este atendimento?',
    removerConfirmacao: 'Remover a confirmação de presença deste atendimento?'
  },

  // ℹ️ Mensagens informativas
  info: {
    carregando: '⏳ Carregando informações...',
    salvando: '💾 Salvando dados...',
    processando: '⚙️ Processando solicitação...',
    agendaVazia: '📋 Nenhum agendamento encontrado para este período.',
    horariosEsgotados: '⏰ Todos os horários estão ocupados nesta data.',
    selecaoPeriodo: '📅 Selecione um período para visualizar os agendamentos.',
    nenhumaObservacao: 'Nenhuma observação registrada'
  },

  // 📝 Textos da interface
  interface: {
    botoes: {
      salvar: 'Salvar Agendamento',
      cancelar: 'Cancelar',
      editar: 'Editar',
      excluir: 'Excluir',
      confirmar: 'Confirmar',
      voltar: 'Voltar',
      novo: 'Novo Agendamento',
      pesquisar: 'Pesquisar',
      limpar: 'Limpar Filtros',
      exportar: 'Exportar Dados',
      bloquear: 'Bloquear Horário',
      desbloquear: 'Liberar Horário',
      confirmarPresenca: 'Confirmar Presença',
      removerConfirmacao: 'Remover Confirmação'
    },
    
    labels: {
      nomeCompleto: '👤 Nome Completo do Cidadão',
      cpf: '📋 CPF',
      telefone: '📞 Telefone de Contato',
      motivo: '🎯 Motivo do Atendimento',
      data: '📅 Data do Agendamento',
      horario: '🕐 Horário',
      entrevistador: '👨‍💼 Profissional Responsável',
      observacoes: '📝 Observações Adicionais',
      status: '📊 Situação'
    },

    placeholders: {
      nomeCompleto: 'Digite o nome completo...',
      cpf: '000.000.000-00',
      telefone: '(00) 00000-0000',
      pesquisar: 'Pesquisar por nome, CPF ou telefone...',
      observacoes: 'Informações adicionais sobre o atendimento...'
    },

    helpers: {
      cpf: 'Digite apenas os números do CPF',
      telefone: 'Inclua o DDD (código da cidade)',
      data: 'Agendamentos não são permitidos aos finais de semana',
      horario: 'Escolha um horário disponível',
      motivo: 'Selecione o motivo principal do atendimento'
    }
  }
};

/**
 * 📊 Status dos agendamentos com descrições humanizadas
 */
export const statusAgendamento = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  realizado: 'Realizado',
  faltou: 'Não Compareceu'
};

/**
 * 🎨 Cores dos status para interface visual
 */
export const coresStatus = {
  agendado: '#2196F3',    // Azul - Agendado
  confirmado: '#4CAF50',  // Verde - Confirmado
  cancelado: '#F44336',   // Vermelho - Cancelado
  realizado: '#9C27B0',   // Roxo - Realizado
  faltou: '#FF9800'       // Laranja - Faltou
};

/**
 * 📅 Formata data para exibição amigável
 * Exemplo: "15 de janeiro de 2025 (quarta-feira)"
 */
export const formatarDataAmigavel = (data) => {
  if (!data) return '-';
  
  try {
    const dataObj = new Date(data);
    const opcoes = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    };
    
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', opcoes);
    return dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  } catch (erro) {
    console.error('❌ Erro ao formatar data:', erro);
    return 'Data inválida';
  }
};

/**
 * 🕐 Formata horário para exibição amigável
 * Exemplo: "14:30" fica "14h30"
 */
export const formatarHorarioAmigavel = (horario) => {
  if (!horario) return '-';
  
  try {
    return horario.replace(':', 'h');
  } catch (erro) {
    console.error('❌ Erro ao formatar horário:', erro);
    return horario;
  }
};

/**
 * 🔤 Normaliza texto para busca (remove acentos, converte para minúsculas)
 */
export const normalizarTexto = (texto) => {
  if (!texto) return '';
  
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * 🔍 Filtra agendamentos por termo de busca
 */
export const filtrarAgendamentos = (agendamentos, termoBusca) => {
  if (!termoBusca?.trim()) return agendamentos;
  
  const termoNormalizado = normalizarTexto(termoBusca);
  
  return agendamentos.filter(agendamento => {
    const nome = normalizarTexto(agendamento.nomeCompleto || '');
    const cpf = (agendamento.cpf || '').replace(/\D/g, '');
    const telefone = (agendamento.telefone || '').replace(/\D/g, '');
    const motivo = normalizarTexto(agendamento.motivo || '');
    
    return nome.includes(termoNormalizado) ||
           cpf.includes(termoNormalizado) ||
           telefone.includes(termoNormalizado) ||
           motivo.includes(termoNormalizado);
  });
};

/**
 * 📈 Calcula estatísticas dos agendamentos
 */
export const calcularEstatisticas = (agendamentos) => {
  if (!agendamentos?.length) {
    return {
      total: 0,
      confirmados: 0,
      pendentes: 0,
      cancelados: 0,
      realizados: 0
    };
  }
  
  const stats = agendamentos.reduce((acc, agendamento) => {
    acc.total++;
    
    switch (agendamento.status) {
      case 'confirmado':
        acc.confirmados++;
        break;
      case 'agendado':
        acc.pendentes++;
        break;
      case 'cancelado':
        acc.cancelados++;
        break;
      case 'realizado':
        acc.realizados++;
        break;
      default:
        acc.pendentes++;
    }
    
    return acc;
  }, {
    total: 0,
    confirmados: 0,
    pendentes: 0,
    cancelados: 0,
    realizados: 0
  });
  
  return stats;
};

/**
 * 📅 Cria data com horário específico de forma segura
 */
export const criarDataHorario = (data, horario) => {
  if (!data || !horario) return null;
  
  try {
    const [hora, minuto] = horario.split(':');
    const dataCompleta = new Date(data);
    dataCompleta.setHours(parseInt(hora, 10), parseInt(minuto, 10), 0, 0);
    return dataCompleta;
  } catch (erro) {
    console.error('❌ Erro ao criar data:', erro);
    return null;
  }
};

/**
 * 🗓️ Verifica se é fim de semana
 */
export const ehFimDeSemana = (data) => {
  const diaSemana = data.getDay();
  return diaSemana === 0 || diaSemana === 6; // Domingo ou Sábado
};

/**
 * 📋 Valida todos os campos obrigatórios de um agendamento
 */
export const validarAgendamento = (dados) => {
  const erros = [];
  
  if (!dados.nomeCompleto?.trim()) {
    erros.push('Nome completo é obrigatório');
  }
  
  const validacaoCPF = validarCPF(dados.cpf);
  if (!validacaoCPF.valido) {
    erros.push(validacaoCPF.mensagem);
  }
  
  const validacaoTelefone = validarTelefone(dados.telefone);
  if (!validacaoTelefone.valido) {
    erros.push(validacaoTelefone.mensagem);
  }
  
  if (!dados.motivo?.trim()) {
    erros.push('Motivo do atendimento é obrigatório');
  }
  
  if (!dados.data) {
    erros.push('Data do agendamento é obrigatória');
  }
  
  if (!dados.horario) {
    erros.push('Horário é obrigatório');
  }
  
  return {
    valido: erros.length === 0,
    erros
  };
};

// Exportação padrão com todas as funções
export default {
  formatarCPF,
  formatarTelefone,
  exibirCPFFormatado,
  exibirTelefoneFormatado,
  validarCPF,
  validarTelefone,
  motivosAtendimento,
  horariosDisponiveis,
  mensagens,
  statusAgendamento,
  coresStatus,
  formatarDataAmigavel,
  formatarHorarioAmigavel,
  normalizarTexto,
  filtrarAgendamentos,
  calcularEstatisticas,
  criarDataHorario,
  ehFimDeSemana,
  validarAgendamento
};
