// =============================================================================
// BLACKLIST PERSISTENTE DE TOKENS JWT
// =============================================================================
// Estratégia em dois níveis (L1 + L2):
//   L1 — Set em memória (Map): resposta em O(1) sem I/O, vive no processo.
//   L2 — tabela `revoked_tokens` no PostgreSQL (Neon): sobrevive a restarts/deploys.
//
// Fluxo de revogar:
//   1. Grava no PostgreSQL (L2) — persistente.
//   2. Adiciona ao Set em memória (L1) — fast-path para requisições subsequentes.
//
// Fluxo de verificar:
//   1. Checa L1 (in-memory) → retorna true imediatamente se encontrado.
//   2. Checa L2 (Postgres)  → popula L1 para o restante do TTL se encontrado.
//
// Limpeza automática de L1:
//   Um intervalo de 10 minutos varre o Map e remove entradas expiradas.
// Limpeza automática de L2:
//   O mesmo intervalo remove do PostgreSQL todos os tokens cujo expiresAt < now(),
//   evitando crescimento ilimitado da tabela revoked_tokens.
// =============================================================================

import prisma from './prisma.js';
import logger from './logger.js';

// L1 cache: Map<jti, expiresAtMs (timestamp unix em ms)>
const memBlacklist = new Map();

// Intervalo de 10 minutos para limpar entradas expiradas do Map
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

const cleanupMemBlacklist = () => {
  const now = Date.now();
  for (const [jti, expiresAtMs] of memBlacklist) {
    if (expiresAtMs <= now) memBlacklist.delete(jti);
  }
};

// P9: Purge de L2 (PostgreSQL). Exclui tokens expirados da tabela revoked_tokens.
// Roda no mesmo intervalo de 10 min que a limpeza de L1. Fire-and-forget — falhas
// são logadas mas não afetam a autenticação (tokens expirados são ignorados mesmo se presentes).
const purgeDbBlacklist = () => {
  prisma.revokedToken
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .then(({ count }) => {
      if (count > 0) logger.info(`[tokenBlacklist] Purge L2: ${count} token(s) expirado(s) removido(s) do banco`);
    })
    .catch((err) => logger.error('[tokenBlacklist] Falha no purge L2', { error: err.message }));
};

// Não bloquear o event loop durante testes — só registra o intervalo em runtime
let _cleanupTimer = null;
export const startCleanupJob = () => {
  if (_cleanupTimer) return;
  _cleanupTimer = setInterval(() => {
    cleanupMemBlacklist();
    purgeDbBlacklist();
  }, CLEANUP_INTERVAL_MS);
  // Permite que o processo encerre sem esperar o intervalo
  if (_cleanupTimer.unref) _cleanupTimer.unref();
};

// =============================================================================
// REVOGAR TOKEN
// =============================================================================

/**
 * Revoga um token JWT impedindo uso futuro até sua expiração natural.
 * Operação fire-and-forget para o PostgreSQL — falhas são logadas mas não
 * bloqueiam a resposta ao cliente (o token já foi rejeitado via cookie clear).
 *
 * @param {string} jti       JWT ID (claim `jti`)
 * @param {number} ttlSeconds Segundos restantes até o token expirar
 */
export const revokeToken = (jti, ttlSeconds) => {
  if (!jti || ttlSeconds <= 0) return;

  const expiresAtMs = Date.now() + ttlSeconds * 1000;

  // L1 — imediato
  memBlacklist.set(jti, expiresAtMs);

  // L2 — persiste (fire-and-forget)
  prisma.revokedToken
    .create({
      data: {
        jti,
        expiresAt: new Date(expiresAtMs),
      },
    })
    .catch((err) => {
      // P2002 = unique violation — token já estava na blacklist, sem problema
      if (err?.code !== 'P2002') {
        logger.error('Falha ao persistir token revogado', { jti, error: err.message });
      }
    });
};

// =============================================================================
// VERIFICAR SE ESTÁ REVOGADO
// =============================================================================

/**
 * Verifica se um JTI foi revogado.
 * Consulta L1 primeiro; se não encontrado, consulta L2 e popula L1.
 *
 * @param {string} jti
 * @returns {Promise<boolean>}
 */
export const isRevoked = async (jti) => {
  if (!jti) return false;

  // L1 — sem I/O
  const memExp = memBlacklist.get(jti);
  if (memExp !== undefined) {
    if (memExp > Date.now()) return true;
    // expirou no Map mas ainda está lá (antes da limpeza) — remove e trata como válido
    memBlacklist.delete(jti);
    return false;
  }

  // L2 — consulta Postgres
  try {
    const record = await prisma.revokedToken.findUnique({
      where: { jti },
      select: { expiresAt: true },
    });

    if (!record) return false;

    const expiresAtMs = record.expiresAt.getTime();
    if (expiresAtMs <= Date.now()) {
      // Token expirou — purga linha (fire-and-forget)
      prisma.revokedToken.delete({ where: { jti } }).catch(() => {});
      return false;
    }

    // Popula L1 para o próximo hit
    const remainingMs = expiresAtMs - Date.now();
    memBlacklist.set(jti, expiresAtMs);
    // Agenda remoção do Map quando expirar
    setTimeout(() => memBlacklist.delete(jti), remainingMs).unref?.();

    return true;
  } catch (err) {
    logger.error('Falha ao verificar blacklist no Postgres — assumindo não revogado', {
      jti,
      error: err.message,
    });
    // Fail-open: em caso de falha do DB, não derruba o serviço.
    // O token permanece inválido via cookie ausente de qualquer forma.
    return false;
  }
};

export default { revokeToken, isRevoked, startCleanupJob };
