/**
 * ============================================================================
 * 🧪 TESTE DE SANITIZAÇÃO DE CACHE
 * ============================================================================
 * 
 * Valida se dados sensíveis estão sendo corretamente sanitizados nos logs
 * 
 * Executar: node backend/scripts/testCacheSanitization.js
 * 
 * ============================================================================
 */

import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

console.log('\n🧪 TESTE DE SANITIZAÇÃO DE CACHE\n');
console.log('=' .repeat(80));

// ============================================================================
// TESTE 1: CPF com formatação
// ============================================================================
console.log('\n📋 TESTE 1: CPF com formatação (123.456.789-00)');
const key1 = 'appointments:busca=João Silva CPF 123.456.789-00';
cache.set(key1, { teste: 'dados' }, 10);
cache.get(key1);
cache.del(key1);
console.log('✅ Deve aparecer [CPF_REDACTED] nos logs acima');

// ============================================================================
// TESTE 2: CPF sem formatação
// ============================================================================
console.log('\n📋 TESTE 2: CPF sem formatação (12345678900)');
const key2 = 'appointments:cpf=12345678900:cras123';
cache.set(key2, { teste: 'dados' }, 10);
cache.get(key2);
cache.del(key2);
console.log('✅ Deve aparecer [CPF_REDACTED] nos logs acima');

// ============================================================================
// TESTE 3: Telefone com formatação
// ============================================================================
console.log('\n📋 TESTE 3: Telefone com formatação (11) 98765-4321');
const key3 = 'appointments:telefone=(11) 98765-4321:pessoa=Maria';
cache.set(key3, { teste: 'dados' }, 10);
cache.get(key3);
cache.del(key3);
console.log('✅ Deve aparecer [TELEFONE_REDACTED] nos logs acima');

// ============================================================================
// TESTE 4: Busca com nome completo
// ============================================================================
console.log('\n📋 TESTE 4: Busca com nome completo');
const key4 = 'appointments:search=Maria da Silva Santos:cras123';
cache.set(key4, { teste: 'dados' }, 10);
cache.get(key4);
cache.del(key4);
console.log('✅ Deve aparecer search=[REDACTED] nos logs acima');

// ============================================================================
// TESTE 5: Múltiplos dados sensíveis
// ============================================================================
console.log('\n📋 TESTE 5: Múltiplos dados sensíveis juntos');
const key5 = 'appointments:cpf=123.456.789-00:telefone1=(11)98765-4321:busca=João Silva';
cache.set(key5, { teste: 'dados' }, 10);
cache.get(key5);
cache.del(key5);
console.log('✅ Todos os dados devem estar [REDACTED] nos logs acima');

// ============================================================================
// TESTE 6: Pattern deletion com dados sensíveis
// ============================================================================
console.log('\n📋 TESTE 6: Deleção por padrão com dados sensíveis');
cache.set('appointments:cras123:cpf=12345678900', { teste: 1 }, 10);
cache.set('appointments:cras123:cpf=98765432100', { teste: 2 }, 10);
cache.delPattern('appointments:cras123:cpf=');
console.log('✅ CPFs devem estar [REDACTED] nos logs acima');

// ============================================================================
// TESTE 7: Chaves seguras (sem dados sensíveis)
// ============================================================================
console.log('\n📋 TESTE 7: Chaves seguras (IDs, status, etc)');
const key7 = 'appointments:cras:123abc:status:agendado:entrevistador:456def';
cache.set(key7, { teste: 'dados' }, 10);
cache.get(key7);
cache.del(key7);
console.log('✅ Deve mostrar chave completa (sem sanitização) nos logs acima');

// ============================================================================
// TESTE 8: Cache statistics
// ============================================================================
console.log('\n📋 TESTE 8: Estatísticas do cache');
const stats = cache.stats();
console.log('📊 Estatísticas:', {
  keys: stats.keys,
  hits: stats.hits,
  misses: stats.misses,
  hitRate: stats.hitRate
});
console.log('✅ Estatísticas obtidas com sucesso');

// ============================================================================
// LIMPEZA
// ============================================================================
console.log('\n🧹 Limpando cache de teste...');
cache.flush();

console.log('\n' + '='.repeat(80));
console.log('✅ TODOS OS TESTES CONCLUÍDOS!');
console.log('\n🔒 VERIFICAÇÃO MANUAL:');
console.log('   1. Revisar logs acima');
console.log('   2. Confirmar que CPFs aparecem como [CPF_REDACTED]');
console.log('   3. Confirmar que telefones aparecem como [TELEFONE_REDACTED]');
console.log('   4. Confirmar que buscas aparecem como search=[REDACTED]');
console.log('   5. Confirmar que chaves seguras (IDs) não são sanitizadas');
console.log('\n💡 Se algum dado sensível estiver visível, a sanitização falhou!\n');
