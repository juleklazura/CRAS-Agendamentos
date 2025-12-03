// Utilitário especializado para exportação de dados em formato CSV
// Permite que usuários baixem relatórios de agendamentos, logs e outros dados
// Implementa codificação UTF-8 e tratamento adequado de caracteres especiais
// Compatível com Excel e outros editores de planilha

/**
 * Função principal para exportar array de objetos como arquivo CSV
 * Gera arquivo com codificação UTF-8 e formatação compatível com Excel
 * Trata automaticamente caracteres especiais (vírgulas, aspas, quebras de linha)
 * 
 * @param {Array} data - Array de objetos com dados para exportar
 * @param {string} filename - Nome do arquivo (sem extensão .csv)
 * @example
 * const agendamentos = [
 *   { nome: 'João Silva', cpf: '123.456.789-00', status: 'agendado' },
 *   { nome: 'Maria Santos', cpf: '987.654.321-00', status: 'realizado' }
 * ];
 * exportToCSV(agendamentos, 'relatorio-agendamentos');
 */
export const exportToCSV = (data, filename) => {
  // Validação rigorosa de entrada
  if (!data || data.length === 0) {
    console.warn('Nenhum dado para exportar');
    return;
  }

  // Extrai cabeçalhos das chaves do primeiro objeto
  // Assume que todos objetos têm a mesma estrutura
  const headers = Object.keys(data[0]);
  
  // Constrói conteúdo CSV com formatação adequada para Excel
  const csvContent = [
    // Linha de cabeçalho
    headers.join(','),
    
    // Linhas de dados com tratamento robusto de caracteres especiais
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        
        // Tratamento especial para strings com caracteres que quebram CSV
        // Vírgulas, aspas duplas e quebras de linha precisam ser escapadas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          // Escapa aspas duplas duplicando-as e envolve em aspas
          return `"${value.replace(/"/g, '""')}"`;
        }
        
        return value || '';  // Retorna valor original ou string vazia para null/undefined
      }).join(',')
    )
  ].join('\n');

  // Criação do blob com BOM para codificação UTF-8 correta
  // BOM (\uFEFF) garante que Excel reconheça acentuação brasileira
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Configuração do elemento de download temporário
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  // Executa download programático e limpa recursos
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Libera memória do blob para evitar memory leaks
  URL.revokeObjectURL(url);
};
