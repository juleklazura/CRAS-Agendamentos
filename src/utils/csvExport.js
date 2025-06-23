// Utilitário para exportar dados em CSV
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    console.warn('Nenhum dado para exportar');
    return;
  }

  // Obter cabeçalhos das chaves do primeiro objeto
  const headers = Object.keys(data[0]);
  
  // Criar conteúdo CSV
  const csvContent = [
    // Cabeçalho
    headers.join(','),
    // Dados
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escapar aspas e adicionar aspas se contém vírgula, aspas ou quebra de linha
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

  // Criar blob e fazer download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};
