// ═══════════════════════════════════════════════════════════════════════════
// 🚀 UTILITÁRIOS DE PERFORMANCE OTIMIZADOS
// ═══════════════════════════════════════════════════════════════════════════
// Conjunto de funções e classes para melhorar a performance da aplicação React
// Inclui cache, debounce, throttle, memoização e hooks customizados
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import axios from 'axios';

// ═══════════════════════════════════════════════════════════════════════════
// 💾 CLASSE: SimpleCache
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Sistema de cache em memória com expiração automática (TTL)
 * 
 * OBJETIVO:
 * - Armazenar temporariamente resultados de operações custosas
 * - Evitar recálculos desnecessários e requisições repetidas à API
 * - Melhorar performance reduzindo processamento redundante
 * 
 * FUNCIONAMENTO:
 * - Usa Map() para armazenamento rápido (O(1) para get/set)
 * - Cada item tem timestamp de criação para controle de validade
 * - Items expirados são automaticamente removidos ao tentar acessá-los
 * - Implementa política FIFO quando atinge tamanho máximo
 * 
 * PARÂMETROS DO CONSTRUTOR:
 * @param {number} maxSize - Número máximo de items no cache (padrão: 100)
 * @param {number} ttl - Tempo de vida em milissegundos (padrão: 5 minutos)
 * 
 * EXEMPLO DE USO:
 * ```javascript
 * const cache = new SimpleCache(50, 10 * 60 * 1000); // 50 items, 10 min
 * cache.set('user_123', { name: 'João', role: 'admin' });
 * const user = cache.get('user_123'); // Retorna objeto ou null se expirou
 * cache.clear(); // Limpa todo o cache
 * ```
 * 
 * QUANDO USAR:
 * - Dados de usuários que não mudam frequentemente
 * - Resultados de cálculos complexos
 * - Lista de CRAS, entrevistadores (dados relativamente estáticos)
 * - Formatação de CPF, telefone (valores já formatados)
 */
export class SimpleCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) {
    this.cache = new Map();     // Map para armazenamento rápido (chave -> valor)
    this.maxSize = maxSize;     // Limite de items antes de limpar os mais antigos
    this.ttl = ttl;             // Tempo de vida em milissegundos
  }

  /**
   * Recupera item do cache (get)
   * 
   * FUNCIONAMENTO:
   * 1. Busca item pela chave no Map
   * 2. Verifica se item existe
   * 3. Calcula se o tempo de vida (TTL) expirou
   * 4. Remove item se expirado ou retorna valor se válido
   * 
   * @param {string} key - Chave única do item no cache
   * @returns {any|null} - Valor armazenado ou null se não existe/expirou
   */
  get(key) {
    const item = this.cache.get(key);
    
    // Item não existe no cache
    if (!item) return null;
    
    // Verifica se item expirou comparando timestamp atual com criação
    const idade = Date.now() - item.timestamp;
    if (idade > this.ttl) {
      this.cache.delete(key); // Remove item expirado
      return null;
    }
    
    // Item válido - retorna valor
    return item.value;
  }

  /**
   * Adiciona ou atualiza item no cache (set)
   * 
   * FUNCIONAMENTO:
   * 1. Verifica se cache atingiu tamanho máximo
   * 2. Se cheio, remove o item mais antigo (FIFO - First In First Out)
   * 3. Adiciona novo item com timestamp atual
   * 
   * @param {string} key - Chave única para identificar o item
   * @param {any} value - Valor a ser armazenado (pode ser qualquer tipo)
   */
  set(key, value) {
    // Limpa cache se exceder tamanho máximo (política FIFO)
    if (this.cache.size >= this.maxSize) {
      // Pega a primeira chave (mais antiga) do Map
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    // Armazena item com timestamp para controle de expiração
    this.cache.set(key, {
      value,                    // Valor propriamente dito
      timestamp: Date.now()     // Momento da criação (em milissegundos)
    });
  }

  /**
   * Limpa completamente o cache
   * 
   * USO:
   * - Quando usuário faz logout
   * - Ao mudar de CRAS ou contexto
   * - Para forçar recarregamento de dados
   */
  clear() {
    this.cache.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⏱️ FUNÇÃO: debounce
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Atrasa a execução de uma função até que pare de ser chamada
 * 
 * OBJETIVO:
 * - Evitar execuções excessivas durante digitação rápida
 * - Reduzir chamadas à API durante busca em tempo real
 * - Melhorar performance em eventos frequentes (onChange, onInput)
 * 
 * FUNCIONAMENTO:
 * 1. Usuário digita "João" (4 teclas pressionadas rapidamente)
 * 2. Cada tecla cancela o timer anterior
 * 3. Função só executa 300ms APÓS a última tecla
 * 4. Resultado: 1 chamada ao invés de 4
 * 
 * ANALOGIA:
 * - Como elevador que espera alguns segundos antes de fechar a porta
 * - Se alguém chega, o timer reseta
 * 
 * PARÂMETROS:
 * @param {Function} func - Função a ser executada após o delay
 * @param {number} delay - Tempo de espera em milissegundos (padrão: 300ms)
 * @returns {Function} - Função debounced que pode ser chamada normalmente
 * 
 * EXEMPLO DE USO:
 * ```javascript
 * // Campo de busca de usuários
 * const buscarUsuarios = debounce((termo) => {
 *   api.get(`/users?search=${termo}`); // Só chama API após parar de digitar
 * }, 500);
 * 
 * <input onChange={(e) => buscarUsuarios(e.target.value)} />
 * // Digitando "João" rápido = apenas 1 chamada à API
 * ```
 * 
 * QUANDO USAR:
 * - Campos de busca/filtro em tempo real
 * - Validação de formulários durante digitação
 * - Auto-save de rascunhos
 * - Qualquer onChange que faz requisição à API
 * 
 * DELAY RECOMENDADO:
 * - Busca: 300-500ms
 * - Auto-save: 1000-2000ms
 * - Validação: 500ms
 */
export const debounce = (func, delay = 300) => {
  let timeoutId; // Armazena ID do setTimeout para poder cancelá-lo
  
  // Retorna função wrapper que será chamada no evento
  return (...args) => {
    clearTimeout(timeoutId);  // Cancela execução anterior (se existir)
    // Agenda nova execução após o delay
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// 🚦 FUNÇÃO: throttle
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Limita execuções de uma função a uma vez por intervalo de tempo
 * 
 * OBJETIVO:
 * - Controlar taxa de execução em eventos que disparam centenas de vezes
 * - Evitar sobrecarga do navegador em scroll, resize, mousemove
 * - Garantir performance em animações e atualizações visuais
 * 
 * DIFERENÇA DO DEBOUNCE:
 * - Debounce: Executa APÓS parar de chamar (aguarda silêncio)
 * - Throttle: Executa DURANTE chamadas, mas com limite de frequência
 * 
 * FUNCIONAMENTO:
 * 1. Usuário faz scroll rápido (200 eventos em 1 segundo)
 * 2. Throttle com limit=100ms permite máximo 10 execuções/segundo
 * 3. Primeiras chamadas executam imediatamente
 * 4. Chamadas subsequentes são ignoradas até passar o limit
 * 
 * ANALOGIA:
 * - Como torneira pingando (máximo 1 gota a cada X milissegundos)
 * - Não importa quantas vezes você aperta, só sai 1 gota por intervalo
 * 
 * PARÂMETROS:
 * @param {Function} func - Função a ser executada com limitação de taxa
 * @param {number} limit - Intervalo mínimo entre execuções em ms (padrão: 100ms)
 * @returns {Function} - Função throttled que respeita o limite de taxa
 * 
 * EXEMPLO DE USO:
 * ```javascript
 * // Atualizar posição de scroll
 * const atualizarScroll = throttle(() => {
 *   console.log('Posição:', window.scrollY);
 * }, 100);
 * 
 * window.addEventListener('scroll', atualizarScroll);
 * // Scroll contínuo = máximo 10 logs por segundo (1000ms / 100ms)
 * ```
 * 
 * QUANDO USAR:
 * - Eventos de scroll (infinite scroll, parallax)
 * - Eventos de resize (responsividade, recalcular layout)
 * - Mousemove (arrasto, tooltips seguindo cursor)
 * - Animações frame-by-frame
 * 
 * LIMIT RECOMENDADO:
 * - Scroll: 100-200ms
 * - Resize: 100-150ms
 * - Mousemove: 50-100ms
 * - API calls: 1000ms+
 */
export const throttle = (func, limit = 100) => {
  let inThrottle; // Flag para controlar se está no período de espera
  
  // Retorna função wrapper
  return (...args) => {
    if (!inThrottle) {              // Se não está em throttle
      func.apply(null, args);        // Executa imediatamente
      inThrottle = true;             // Ativa flag de throttle
      // Após o limit, libera para próxima execução
      setTimeout(() => inThrottle = false, limit);
    }
    // Se inThrottle=true, ignora a chamada (throttling em ação)
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 FUNÇÃO: memoize
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Cria versão memoizada de uma função (cacheia resultados por argumentos)
 * 
 * OBJETIVO:
 * - Evitar recálculos de funções puras com mesmos argumentos
 * - Armazenar resultados já computados em cache permanente
 * - Acelerar funções matemáticas, formatações e transformações custosas
 * 
 * FUNCIONAMENTO:
 * 1. Primeira chamada: calcula resultado e armazena no cache
 * 2. Chamadas subsequentes com mesmos args: retorna do cache (instantâneo)
 * 3. Cache é Map: key = argumentos serializados, value = resultado
 * 
 * DIFERENÇA DO SimpleCache:
 * - SimpleCache: cache manual (você controla get/set)
 * - Memoize: cache automático baseado nos argumentos da função
 * 
 * PARÂMETROS:
 * @param {Function} fn - Função pura a ser memoizada
 * @param {Function} keyGenerator - (Opcional) Função custom para gerar chave do cache
 * @returns {Function} - Versão memoizada que retorna resultado do cache quando possível
 * 
 * EXEMPLO DE USO:
 * ```javascript
 * // Função custosa: calcular fatorial
 * const fatorial = (n) => {
 *   if (n <= 1) return 1;
 *   return n * fatorial(n - 1);
 * };
 * 
 * const fatorialMemo = memoize(fatorial);
 * 
 * fatorialMemo(5);  // Calcula: 1ms
 * fatorialMemo(5);  // Cache:  0.01ms (100x mais rápido!)
 * fatorialMemo(6);  // Calcula: 1ms (argumentos diferentes)
 * ```
 * 
 * EXEMPLO COM KEY GENERATOR:
 * ```javascript
 * // Buscar usuário por ID (ignorar outros params)
 * const buscarUsuario = memoize(
 *   (id, includeDeleted) => api.get(`/users/${id}`),
 *   (id) => id  // Chave = apenas ID (ignora includeDeleted)
 * );
 * ```
 * 
 * QUANDO USAR:
 * - Funções puras (mesma entrada = mesma saída sempre)
 * - Cálculos matemáticos complexos
 * - Formatações (CPF, telefone, data)
 * - Transformações de dados
 * - Validações custosas
 * 
 * ⚠️ NÃO USAR:
 * - Funções com side-effects (API calls, localStorage, Date.now())
 * - Funções que retornam valores diferentes para mesmos args
 * - Argumentos muito grandes (serialização custosa)
 */
export const memoize = (fn, keyGenerator) => {
  const cache = new Map(); // Cache permanente (não expira)
  
  // Retorna versão memoizada da função
  return (...args) => {
    // Gera chave única baseada nos argumentos
    const key = keyGenerator 
      ? keyGenerator(...args)           // Custom: use função fornecida
      : JSON.stringify(args);           // Padrão: serializa argumentos
    
    // Verifica se já existe no cache
    if (cache.has(key)) {
      return cache.get(key);  // Retorna resultado cacheado (rápido!)
    }
    
    // Não existe no cache: calcula resultado
    const result = fn(...args);
    cache.set(key, result);   // Armazena no cache para próximas chamadas
    return result;
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// 📊 FORMATADORES OTIMIZADOS (com cache duplo: memoize + SimpleCache)
// ═══════════════════════════════════════════════════════════════════════════

// Cache compartilhado para formatadores (1000 items, 10 minutos de TTL)
const formatCache = new SimpleCache(1000, 10 * 60 * 1000);

/**
 * Formata data para padrão brasileiro (dd/mm/aaaa hh:mm)
 * 
 * OTIMIZAÇÃO:
 * - Usa memoize: mesmo timestamp sempre retorna mesma string formatada
 * - Evita recriação de Date() e toLocaleDateString() repetidamente
 * 
 * @param {string|Date} data - Data em qualquer formato (ISO, timestamp, Date object)
 * @returns {string} - Data formatada "01/12/2025 14:30" ou "-" se inválida
 * 
 * EXEMPLO:
 * ```javascript
 * formatarDataOtimizado("2025-11-22T10:30:00Z");  // "22/11/2025 10:30"
 * formatarDataOtimizado(null);                     // "-"
 * ```
 */
export const formatarDataOtimizado = memoize((data) => {
  if (!data) return '-';  // Retorna placeholder se data vazia
  
  try {
    const dataObj = new Date(data);
    // Formata para pt-BR automaticamente
    return dataObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Data inválida';
  }
});

/**
 * Formata CPF para padrão brasileiro (000.000.000-00)
 * 
 * OTIMIZAÇÃO DUPLA:
 * 1. Memoize: mesmo CPF sempre retorna mesma formatação
 * 2. SimpleCache: cache adicional com TTL (redundância intencional)
 * 
 * @param {string} cpf - CPF com ou sem formatação
 * @returns {string} - CPF formatado "123.456.789-00" ou "" se vazio
 * 
 * EXEMPLO:
 * ```javascript
 * formatarCPFOtimizado("12345678900");      // "123.456.789-00"
 * formatarCPFOtimizado("123.456.789-00");   // "123.456.789-00" (mantém)
 * ```
 */
export const formatarCPFOtimizado = memoize((cpf) => {
  if (!cpf) return '';
  
  // Verifica cache secundário (SimpleCache com TTL)
  const cached = formatCache.get(`cpf_${cpf}`);
  if (cached) return cached;
  
  // Remove tudo exceto números e limita a 11 dígitos
  const apenasNumeros = cpf.replace(/\D/g, '').slice(0, 11);
  
  // Aplica máscara: 000.000.000-00
  const formatted = apenasNumeros
    .replace(/(\d{3})(\d)/, '$1.$2')      // Primeiro ponto após 3º dígito
    .replace(/(\d{3})(\d)/, '$1.$2')      // Segundo ponto após 6º dígito
    .replace(/(\d{3})(\d{1,2})/, '$1-$2'); // Hífen após 9º dígito
  
  // Armazena no cache secundário
  formatCache.set(`cpf_${cpf}`, formatted);
  return formatted;
});

/**
 * Formata telefone para padrão brasileiro
 * Suporta fixo (10 dígitos) e celular (11 dígitos)
 * 
 * OTIMIZAÇÃO DUPLA:
 * 1. Memoize: mesmo telefone sempre retorna mesma formatação
 * 2. SimpleCache: cache adicional com TTL
 * 
 * @param {string} telefone - Telefone com ou sem formatação
 * @returns {string} - Telefone formatado "(00) 0000-0000" ou "(00) 00000-0000"
 * 
 * FORMATOS:
 * - Fixo:    (11) 3333-4444  (10 dígitos)
 * - Celular: (11) 93333-4444 (11 dígitos)
 * 
 * EXEMPLO:
 * ```javascript
 * formatarTelefoneOtimizado("1133334444");   // "(11) 3333-4444"
 * formatarTelefoneOtimizado("11933334444");  // "(11) 93333-4444"
 * ```
 */
export const formatarTelefoneOtimizado = memoize((telefone) => {
  if (!telefone) return '';
  
  // Verifica cache secundário
  const cached = formatCache.get(`tel_${telefone}`);
  if (cached) return cached;
  
  // Remove tudo exceto números e limita a 11 dígitos
  const apenasNumeros = telefone.replace(/\D/g, '').slice(0, 11);
  let formatted;
  
  // Aplica máscara baseada no tamanho
  if (apenasNumeros.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    formatted = apenasNumeros
      .replace(/(\d{2})(\d)/, '($1) $2')    // DDD entre parênteses
      .replace(/(\d{4})(\d)/, '$1-$2');     // Hífen após 4 dígitos
  } else {
    // Celular: (00) 00000-0000
    formatted = apenasNumeros
      .replace(/(\d{2})(\d)/, '($1) $2')    // DDD entre parênteses
      .replace(/(\d{5})(\d)/, '$1-$2');     // Hífen após 5 dígitos
  }
  
  // Armazena no cache secundário
  formatCache.set(`tel_${telefone}`, formatted);
  return formatted;
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔍 FUNÇÃO: criarFiltro
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Cria função de filtro otimizada para busca em arrays de objetos
 * 
 * OBJETIVO:
 * - Buscar termo em múltiplos campos de objetos simultaneamente
 * - Ignorar case (maiúsculas/minúsculas) e espaços extras
 * - Retornar função reutilizável para .filter()
 * 
 * FUNCIONAMENTO:
 * 1. Normaliza termo de busca (lowercase, trim)
 * 2. Retorna função que verifica se termo existe em algum dos campos
 * 3. Usa .some() para parar na primeira match (performance)
 * 
 * PARÂMETROS:
 * @param {string} termo - Texto a ser buscado
 * @param {string[]} campos - Array com nomes dos campos a serem pesquisados
 * @returns {Function} - Função de filtro compatível com Array.filter()
 * 
 * EXEMPLO DE USO:
 * ```javascript
 * const usuarios = [
 *   { nome: 'João Silva', cpf: '111.111.111-11', email: 'joao@email.com' },
 *   { nome: 'Maria Santos', cpf: '222.222.222-22', email: 'maria@email.com' }
 * ];
 * 
 * // Buscar "silva" em nome, cpf e email
 * const filtro = criarFiltro('silva', ['nome', 'cpf', 'email']);
 * const resultado = usuarios.filter(filtro);
 * // Retorna: [{ nome: 'João Silva', ... }]
 * ```
 * 
 * CASOS ESPECIAIS:
 * - Termo vazio/null: retorna função que aceita tudo (() => true)
 * - Campo não existe no objeto: ignora e continua
 * - Valor do campo é null/undefined: ignora e continua
 * 
 * QUANDO USAR:
 * - Campos de busca global em tabelas
 * - Filtros de lista de usuários, agendamentos, CRAS
 * - Autocomplete/sugestões em tempo real
 */
export const criarFiltro = (termo, campos) => {
  // Se termo vazio, retorna função que aceita todos os items
  if (!termo?.trim()) return () => true;
  
  // Normaliza termo para busca case-insensitive
  const termoNormalizado = termo.toLowerCase().trim();
  
  // Retorna função de filtro
  return (item) => {
    // Verifica se termo existe em ALGUM dos campos (.some = OR lógico)
    return campos.some(campo => {
      const valor = item[campo];
      if (!valor) return false;  // Campo vazio/inexistente = pula
      
      // Converte valor para string e verifica se contém termo
      return String(valor).toLowerCase().includes(termoNormalizado);
    });
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// 📈 HOOK: usePaginacao
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Hook customizado para paginação otimizada de listas
 * 
 * OBJETIVO:
 * - Dividir arrays grandes em páginas menores (performance)
 * - Fornecer controles de navegação (próxima, anterior, ir para)
 * - Recalcular apenas quando dados ou página mudam (useMemo)
 * 
 * FUNCIONAMENTO:
 * 1. Recebe array completo de dados
 * 2. Calcula slice da página atual usando useMemo
 * 3. Retorna apenas subset visível + funções de navegação
 * 
 * BENEFÍCIOS:
 * - Renderiza apenas items visíveis (economia de DOM)
 * - Scroll e eventos mais fluidos
 * - Menor uso de memória no navegador
 * 
 * PARÂMETROS:
 * @param {Array} dados - Array completo de items a serem paginados
 * @param {number} itensPorPagina - Quantos items exibir por página (padrão: 10)
 * @returns {Object} - Objeto com dados paginados e funções de navegação
 * 
 * RETORNO:
 * {
 *   dadosPaginados: Array,        // Items da página atual
 *   paginaAtual: number,           // Número da página (1-based)
 *   totalPaginas: number,          // Total de páginas disponíveis
 *   irParaPagina: Function,        // Ir para página específica
 *   proximaPagina: Function,       // Avançar uma página
 *   paginaAnterior: Function,      // Voltar uma página
 *   temProximaPagina: boolean,     // Se existe próxima página
 *   temPaginaAnterior: boolean     // Se existe página anterior
 * }
 * 
 * EXEMPLO DE USO:
 * ```javascript
 * function ListaUsuarios() {
 *   const [usuarios, setUsuarios] = useState([...100 usuários]);
 *   
 *   const {
 *     dadosPaginados,
 *     paginaAtual,
 *     totalPaginas,
 *     proximaPagina,
 *     paginaAnterior
 *   } = usePaginacao(usuarios, 20);  // 20 items por página
 *   
 *   return (
 *     <>
 *       {dadosPaginados.map(user => <UserCard key={user.id} {...user} />)}
 *       <button onClick={paginaAnterior}>Anterior</button>
 *       <span>Página {paginaAtual} de {totalPaginas}</span>
 *       <button onClick={proximaPagina}>Próxima</button>
 *     </>
 *   );
 * }
 * ```
 * 
 * QUANDO USAR:
 * - Tabelas com >50 linhas
 * - Listas longas de agendamentos, usuários, logs
 * - Qualquer lista que cause scroll pesado
 * 
 * OTIMIZAÇÕES APLICADAS:
 * - useMemo: recalcula slice apenas quando necessário
 * - useCallback: funções de navegação não recriam em cada render
 */
export const usePaginacao = (dados, itensPorPagina = 10) => {
  const [paginaAtual, setPaginaAtual] = React.useState(1);
  
  // Calcula subset de dados da página atual (apenas quando dados/página mudam)
  const dadosPaginados = React.useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return dados.slice(inicio, fim);  // Slice = O(1) para índices, não copia todo array
  }, [dados, paginaAtual, itensPorPagina]);
  
  // Calcula total de páginas
  const totalPaginas = Math.ceil(dados.length / itensPorPagina);
  
  // Função para ir para página específica (com validação de limites)
  const irParaPagina = React.useCallback((pagina) => {
    setPaginaAtual(
      Math.max(1, Math.min(pagina, totalPaginas))  // Clamp entre 1 e totalPaginas
    );
  }, [totalPaginas]);
  
  // Retorna API completa de paginação
  return {
    dadosPaginados,                                    // Items visíveis
    paginaAtual,                                       // Página atual (1-based)
    totalPaginas,                                      // Total de páginas
    irParaPagina,                                      // Ir para página N
    proximaPagina: () => irParaPagina(paginaAtual + 1), // Helper: avançar
    paginaAnterior: () => irParaPagina(paginaAtual - 1), // Helper: voltar
    temProximaPagina: paginaAtual < totalPaginas,      // Boolean: pode avançar?
    temPaginaAnterior: paginaAtual > 1                 // Boolean: pode voltar?
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 FUNÇÃO: criarAxiosOtimizado (DEPRECIADA)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * ⚠️ FUNÇÃO DEPRECIADA - NÃO USAR EM CÓDIGO NOVO
 * 
 * Cria instância customizada do Axios com interceptors de logging
 * 
 * MOTIVO DA DEPRECIAÇÃO:
 * - Sistema migrou para cookies httpOnly (segurança contra XSS)
 * - Token não deve mais ser lido de localStorage
 * - Arquivo src/services/api.js já implementa isso corretamente
 * 
 * PROBLEMA DE SEGURANÇA NESTA FUNÇÃO:
 * ```javascript
 * const token = localStorage.getItem('token');  // ❌ VULNERÁVEL A XSS
 * ```
 * 
 * USO CORRETO:
 * - Importe e use: import api from '../services/api.js'
 * - API já configurada com withCredentials: true
 * - Cookies enviados automaticamente pelo navegador
 * 
 * @deprecated Use src/services/api.js ao invés desta função
 * @returns {AxiosInstance} - Instância do axios com interceptors
 * 
 * HISTÓRICO:
 * - Criada antes da migração para cookies httpOnly
 * - Mantida apenas para compatibilidade temporária
 * - Será removida em versão futura
 */
export const criarAxiosOtimizado = () => {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    withCredentials: true,  // 🔒 Envia cookies automaticamente
    timeout: 10000
  });
  
  // Request interceptor - logging de requisições
  instance.interceptors.request.use(
    (config) => {
      // 🔒 Token agora é enviado automaticamente via cookies httpOnly
      // Não precisa mais adicionar Authorization header manualmente
      
      // Log para desenvolvimento (ajuda debug)
      if (import.meta.env.DEV) {
        console.log('🚀 API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          data: config.data
        });
      }
      
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  // Response interceptor - logging e tratamento de erros
  instance.interceptors.response.use(
    (response) => {
      // Log de sucesso em desenvolvimento
      if (import.meta.env.DEV) {
        console.log('✅ API Response:', {
          status: response.status,
          url: response.config.url,
          data: response.data
        });
      }
      return response;
    },
    (error) => {
      // Log de erros em desenvolvimento
      if (import.meta.env.DEV) {
        console.error('❌ API Error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.message || error.message
        });
      }
      
      // Logout automático em caso de token inválido
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Limpar localStorage residual (migração)
        localStorage.clear();
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
  );
  
  return instance;
};

// ═══════════════════════════════════════════════════════════════════════════
// 📱 HOOK: useIsMobile
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Hook para detectar se usuário está em dispositivo móvel
 * 
 * OBJETIVO:
 * - Renderizar UI diferente para mobile vs desktop
 * - Ajustar layout responsivo dinamicamente
 * - Habilitar/desabilitar funcionalidades específicas por device
 * 
 * FUNCIONAMENTO:
 * 1. Verifica largura da janela (<768px = mobile)
 * 2. Adiciona listener de resize com throttle (performance)
 * 3. Atualiza estado quando usuário redimensiona janela
 * 
 * BREAKPOINT:
 * - Mobile: < 768px (padrão Bootstrap/Tailwind)
 * - Desktop: >= 768px
 * 
 * OTIMIZAÇÕES:
 * - Throttle no resize (evita centenas de re-renders)
 * - Cleanup adequado do listener
 * 
 * @returns {boolean} - true se mobile, false se desktop
 * 
 * EXEMPLO DE USO:
 * ```javascript
 * function Sidebar() {
 *   const isMobile = useIsMobile();
 *   
 *   return (
 *     <aside className={isMobile ? 'drawer' : 'sidebar-fixed'}>
 *       {isMobile ? <HamburgerMenu /> : <FullMenu />}
 *     </aside>
 *   );
 * }
 * ```
 * 
 * CASOS DE USO:
 * - Mostrar/esconder sidebar em mobile
 * - Mudar de tabela para cards em mobile
 * - Desabilitar drag-and-drop em touch devices
 * - Ajustar tamanho de modais
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    // Função para verificar se é mobile
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);  // Breakpoint padrão
    };
    
    // Executa imediatamente na montagem
    checkIsMobile();
    
    // Adiciona listener com throttle (max 10 checks/segundo)
    const throttledResize = throttle(checkIsMobile, 100);
    window.addEventListener('resize', throttledResize);
    
    // Cleanup: remove listener ao desmontar
    return () => window.removeEventListener('resize', throttledResize);
  }, []);
  
  return isMobile;
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 HOOK: useOptimizedState
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Hook para gerenciar estado com otimização automática de re-renders
 * 
 * OBJETIVO:
 * - Evitar re-renders desnecessários quando estado não muda de fato
 * - Fornecer função de reset conveniente
 * - Detectar mudanças reais comparando valores deep
 * 
 * FUNCIONAMENTO:
 * 1. Antes de atualizar estado, compara novo valor com anterior
 * 2. Se idênticos (JSON.stringify), mantém referência antiga (sem re-render)
 * 3. Se diferentes, atualiza normalmente
 * 
 * DIFERENÇA DO useState NORMAL:
 * ```javascript
 * // useState normal:
 * setState({ name: 'João' });  // Re-render SEMPRE (nova referência)
 * setState({ name: 'João' });  // Re-render SEMPRE (mesmo valor!)
 * 
 * // useOptimizedState:
 * updateState({ name: 'João' });  // Re-render na 1ª vez
 * updateState({ name: 'João' });  // SEM re-render (valor igual!)
 * ```
 * 
 * @param {any} initialState - Estado inicial (qualquer tipo serializável)
 * @returns {[state, updateState, resetState]} - Tupla similar ao useState
 * 
 * RETORNO:
 * - state: Estado atual
 * - updateState: Função para atualizar (aceita objeto ou função)
 * - resetState: Função para voltar ao estado inicial
 * 
 * EXEMPLO DE USO:
 * ```javascript
 * function Form() {
 *   const [form, updateForm, resetForm] = useOptimizedState({
 *     nome: '',
 *     email: '',
 *     telefone: ''
 *   });
 *   
 *   const handleChange = (e) => {
 *     // Merge com estado anterior
 *     updateForm({ [e.target.name]: e.target.value });
 *   };
 *   
 *   const handleReset = () => {
 *     resetForm();  // Volta ao estado inicial
 *   };
 *   
 *   // Se digitar mesmo valor 2x, não re-renderiza
 * }
 * ```
 * 
 * ⚠️ LIMITAÇÕES:
 * - Comparação via JSON.stringify (não detecta funções, Date, etc)
 * - Não usar com objetos muito grandes (serialização custosa)
 * - Prefira para formulários e objetos simples
 * 
 * QUANDO USAR:
 * - Formulários com múltiplos campos
 * - Filtros complexos
 * - Configurações/preferências
 * - Qualquer estado que pode receber "mesmos valores" repetidamente
 */
export const useOptimizedState = (initialState) => {
  const [state, setState] = React.useState(initialState);
  
  // Função de atualização com detecção de mudanças
  const updateState = React.useCallback((updates) => {
    setState(prev => {
      // Calcula novo estado (suporta função ou objeto)
      const newState = typeof updates === 'function' 
        ? updates(prev) 
        : { ...prev, ...updates };
      
      // Compara deep: se igual, retorna referência antiga (sem re-render)
      return JSON.stringify(newState) === JSON.stringify(prev) 
        ? prev       // Mesma referência = React não re-renderiza
        : newState;  // Nova referência = React re-renderiza
    });
  }, []);
  
  // Função de reset (volta ao estado inicial)
  const resetState = React.useCallback(() => {
    setState(initialState);
  }, [initialState]);
  
  return [state, updateState, resetState];
};

// ═══════════════════════════════════════════════════════════════════════════
// 💾 HOOK: usePersistedState
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Hook para persistir estado no localStorage automaticamente
 * 
 * OBJETIVO:
 * - Salvar estado entre reloads da página
 * - Manter preferências do usuário (tema, idioma, filtros)
 * - Sincronizar estado React com localStorage
 * 
 * FUNCIONAMENTO:
 * 1. Inicialização: tenta ler valor do localStorage
 * 2. Se não existe, usa defaultValue
 * 3. Toda atualização salva automaticamente no localStorage
 * 
 * ⚠️ SEGURANÇA: NÃO USAR PARA DADOS SENSÍVEIS
 * - localStorage é acessível por qualquer JavaScript
 * - NÃO armazenar tokens, senhas, dados pessoais
 * - Apenas para preferências não-sensíveis
 * 
 * @param {string} key - Chave única no localStorage
 * @param {any} defaultValue - Valor padrão se não existir no localStorage
 * @returns {[state, setValue]} - Tupla similar ao useState
 * 
 * EXEMPLO DE USO:
 * ```javascript
 * function App() {
 *   // Persiste tema (escuro/claro)
 *   const [tema, setTema] = usePersistedState('app_tema', 'light');
 *   
 *   // Persiste idioma
 *   const [idioma, setIdioma] = usePersistedState('app_idioma', 'pt-BR');
 *   
 *   // Ao trocar tema, salva automaticamente
 *   const toggleTema = () => {
 *     setTema(tema === 'light' ? 'dark' : 'light');
 *     // localStorage.setItem('app_tema', 'dark') ← acontece automaticamente
 *   };
 *   
 *   // Ao recarregar página, tema é restaurado
 * }
 * ```
 * 
 * USO ADEQUADO (OK):
 * - Tema (dark/light)
 * - Idioma/localização
 * - Preferência de visualização (grid/list)
 * - Estado de filtros não-sensíveis
 * - Último CRAS selecionado (para conveniência)
 * 
 * ❌ NÃO USAR PARA:
 * - Tokens de autenticação (usar cookies httpOnly)
 * - Senhas ou credenciais
 * - CPF, dados pessoais
 * - Informações médicas ou financeiras
 * 
 * QUANDO USAR:
 * - Melhorar UX mantendo preferências entre sessões
 * - Evitar perder progresso em formulários (com cuidado)
 * - Lembrar configurações não-críticas
 */
export const usePersistedState = (key, defaultValue) => {
  // Inicialização: tenta ler do localStorage
  const [state, setState] = React.useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      // Se erro (JSON inválido, localStorage bloqueado), usa default
      return defaultValue;
    }
  });
  
  // Função de atualização que persiste automaticamente
  const setValue = React.useCallback((value) => {
    try {
      setState(value);                          // Atualiza estado React
      localStorage.setItem(key, JSON.stringify(value)); // Persiste no localStorage
    } catch (error) {
      // localStorage pode estar cheio ou bloqueado
      console.error(`Erro ao salvar no localStorage:`, error);
    }
  }, [key]);
  
  return [state, setValue];
};

// ═══════════════════════════════════════════════════════════════════════════
// 📦 EXPORT DEFAULT - Todas as utilidades em um único objeto
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Exportação padrão com todas as utilidades de performance
 * 
 * OPÇÕES DE IMPORT:
 * 
 * 1. Import individual (recomendado - tree shaking):
 * ```javascript
 * import { debounce, formatarCPFOtimizado } from './performanceUtils';
 * ```
 * 
 * 2. Import default (importa tudo):
 * ```javascript
 * import perfUtils from './performanceUtils';
 * perfUtils.debounce(...);
 * ```
 * 
 * CONTEÚDO:
 * - SimpleCache: Classe de cache com TTL
 * - debounce: Atrasar execução até parar de chamar
 * - throttle: Limitar taxa de execução
 * - memoize: Cachear resultados por argumentos
 * - formatarDataOtimizado: Formatar datas pt-BR
 * - formatarCPFOtimizado: Formatar CPF com máscara
 * - formatarTelefoneOtimizado: Formatar telefone com máscara
 * - criarFiltro: Busca em múltiplos campos
 * - usePaginacao: Hook de paginação
 * - criarAxiosOtimizado: ⚠️ Depreciado - usar src/services/api.js
 * - useIsMobile: Hook para detectar mobile
 * - useOptimizedState: Hook de estado com anti-re-render
 * - usePersistedState: Hook de estado persistido em localStorage
 */
export default {
  SimpleCache,
  debounce,
  throttle,
  memoize,
  formatarDataOtimizado,
  formatarCPFOtimizado,
  formatarTelefoneOtimizado,
  criarFiltro,
  usePaginacao,
  criarAxiosOtimizado,
  useIsMobile,
  useOptimizedState,
  usePersistedState
};
