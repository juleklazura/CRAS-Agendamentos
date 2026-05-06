/**
 * SCRIPT DE MIGRAÇÃO: cpfHash SHA-256 → HMAC-SHA-256
 *
 * Por que executar este script?
 * ───────────────────────────────────────────────────
 * O método EncryptionService.hash() foi alterado de SHA-256 puro para
 * HMAC-SHA-256 (usando ENCRYPTION_KEY como segredo), tornando os hashes
 * resistentes a ataques de dicionário/rainbow table caso o banco seja exposto.
 *
 * Os cpfHash existentes no banco ainda usam SHA-256 puro. Sem esta migração,
 * todas as buscas por CPF retornarão zero resultados após o deploy.
 *
 * Como executar (no servidor Render ou localmente com .env de prod):
 * ──────────────────────────────────────────────────────────────────
 *   node scripts/migrateCpfHmac.js
 *
 * Pré-requisitos:
 *   - DATABASE_URL e ENCRYPTION_KEY devem estar definidos no ambiente
 *   - Executar ANTES de fazer o deploy do código com o novo hash()
 *
 * Segurança:
 *   - Este script lê o CPF criptografado, descriptografa, recalcula o HMAC
 *     e grava o novo hash. O CPF em si nunca fica em log.
 *   - Processa em lotes de 100 para não sobrecarregar o banco.
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const BATCH_SIZE = 100;

// ──────────────────────────────────────────────────────────────────────────────
// Utilitários de criptografia (replicados aqui para independência do módulo)
// ──────────────────────────────────────────────────────────────────────────────

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('❌  ENCRYPTION_KEY não está definida. Abortando.');
  process.exit(1);
}

/**
 * Descriptografa um campo AES-256-GCM (ou CBC legado).
 * Retorna null em caso de falha — o registro será pulado com aviso.
 */
function decryptField(text) {
  if (!text || !text.includes(':')) return text;
  try {
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const parts = text.split(':');
    if (parts.length === 3) {
      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    if (parts.length === 2) {
      const [ivHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Calcula o novo HMAC-SHA-256 do CPF (dígitos apenas).
 */
function hmacCpf(cpf) {
  const digits = cpf.replace(/\D/g, '');
  return crypto.createHmac('sha256', ENCRYPTION_KEY).update(digits).digest('hex');
}

// ──────────────────────────────────────────────────────────────────────────────
// Migração
// ──────────────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('🔄  Iniciando migração cpfHash SHA-256 → HMAC-SHA-256...\n');

  const total = await prisma.appointment.count();
  console.log(`📊  Total de agendamentos: ${total}`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let cursor = undefined;

  while (true) {
    const batch = await prisma.appointment.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, cpf: true, cpfHash: true },
      orderBy: { id: 'asc' },
    });

    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;

    const updates = [];
    for (const record of batch) {
      const cpfDecrypted = decryptField(record.cpf);
      if (!cpfDecrypted) {
        console.warn(`  ⚠️  Agendamento ${record.id}: falha ao descriptografar CPF — pulando`);
        skipped++;
        continue;
      }

      const newHash = hmacCpf(cpfDecrypted);

      // Se o hash já é HMAC (igualmente ao recalculado), pula sem UPDATE
      if (record.cpfHash === newHash) {
        processed++;
        continue;
      }

      updates.push({ id: record.id, cpfHash: newHash });
    }

    // Atualiza em paralelo dentro do lote
    await Promise.all(
      updates.map((u) =>
        prisma.appointment.update({
          where: { id: u.id },
          data: { cpfHash: u.cpfHash },
        })
      )
    );

    processed += batch.length - skipped;
    updated += updates.length;
    console.log(`  ✅  Lote processado: ${processed}/${total} (${updated} atualizados, ${skipped} pulados)`);
  }

  console.log('\n────────────────────────────────────────');
  console.log(`✅  Migração concluída.`);
  console.log(`   Total processados : ${processed}`);
  console.log(`   Hashes atualizados: ${updated}`);
  console.log(`   Pulados (erro)    : ${skipped}`);
  console.log('────────────────────────────────────────');
}

migrate()
  .catch((err) => {
    console.error('❌  Erro durante a migração:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
