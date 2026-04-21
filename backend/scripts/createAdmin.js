/**
 * ============================================================================
 * 👤 SCRIPT DE CRIAÇÃO DO ADMINISTRADOR INICIAL
 * ============================================================================
 * 
 * Cria o primeiro usuário admin no PostgreSQL (Neon)
 * 
 * Executar: node backend/scripts/createAdmin.js
 * ============================================================================
 */

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

dotenv.config();

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Conectando ao PostgreSQL (Neon)...');
    await prisma.$connect();
    console.log('✅ Conectado!\n');

    const count = await prisma.user.count();
    console.log('Usuários no banco:', count);

    if (count === 0) {
      console.log('\n⚠️  Banco vazio! Criando usuário admin...');

      const adminMatricula = process.env.ADMIN_MATRICULA || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminPassword) {
        console.error('❌ ERRO: Defina ADMIN_PASSWORD no arquivo .env antes de executar este script.');
        console.error('   Gerar senha forte: node -e "console.log(require(\'crypto\').randomBytes(16).toString(\'hex\'))"');
        process.exit(1);
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      await prisma.user.create({
        data: {
          name: 'Administrador',
          matricula: adminMatricula,
          password: hashedPassword,
          role: 'admin',
        },
      });

      console.log('✅ Usuário admin criado!');
      console.log(`   Matrícula: ${adminMatricula}`);
      console.log('   Senha: (conforme ADMIN_PASSWORD no .env)');
    } else {
      console.log('\n👥 Usuários existentes:');
      const users = await prisma.user.findMany({
        select: { name: true, matricula: true, role: true },
      });
      users.forEach((u) =>
        console.log(`   - ${u.name} (${u.matricula}) - ${u.role}`)
      );
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

createAdmin();
