// Utilitário para exportação de dados em formato CSV
// Permite que usuários baixem relatórios de agendamentos e logs

/**
 * Função principal para exportar array de objetos como arquivo CSV
 * @param {Array} data - Array de objetos com dados para exportar
 * @param {string} filename - Nome do arquivo (sem extensão)
 */
export const exportToCSV = (data, filename) => {
  // Validação de entrada
  if (!data || data.length === 0) {
    console.warn('Nenhum dado para exportar');
    return;
  }

  // Extrai cabeçalhos das chaves do primeiro objeto
  const headers = Object.keys(data[0]);
  
  // Constrói conteúdo CSV com formatação adequada
  const csvContent = [
    // Linha de cabeçalho
    headers.join(','),
    
    // Linhas de dados com tratamento de caracteres especiais
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        
        // Tratamento especial para strings com caracteres que quebram CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          // Escapa aspas duplas e envolve em aspas
          return `"${value.replace(/"/g, '""')}"`;
        }
        
        return value || '';  // Retorna valor ou string vazia
      }).join(',')
    )
  ].join('\n');

  // Criação e download do arquivo
  // BOM (\uFEFF) garante codificação UTF-8 correta no Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Configuração do link de download
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  // Executa download e limpa recursos
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Libera memória do blob
  URL.revokeObjectURL(url);
};
