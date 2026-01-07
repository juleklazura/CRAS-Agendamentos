/**
 * Script de migração para remover horários de almoço (12:00 e 12:30)
 * dos entrevistadores existentes no banco de dados.
 * 
 * Uso: node backend/scripts/removeHorarioAlmoco.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../models/User.js';

// Carregar .env do diretório backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const HORARIOS_ALMOCO = ['12:00', '12:30'];

async function removerHorariosAlmoco() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Buscar todos os entrevistadores
    const entrevistadores = await User.find({ role: 'entrevistador' });
    console.log(`📋 Encontrados ${entrevistadores.length} entrevistadores`);

    let atualizados = 0;

    for (const entrevistador of entrevistadores) {
      const horariosAtuais = entrevistador.agenda?.horariosDisponiveis || [];
      
      // Verificar se tem horários de almoço
      const temHorarioAlmoco = horariosAtuais.some(h => HORARIOS_ALMOCO.includes(h));
      
      if (temHorarioAlmoco) {
        // Filtrar removendo os horários de almoço
        const novosHorarios = horariosAtuais.filter(h => !HORARIOS_ALMOCO.includes(h));
        
        // Atualizar no banco
        await User.findByIdAndUpdate(entrevistador._id, {
          'agenda.horariosDisponiveis': novosHorarios
        });
        
        console.log(`✅ ${entrevistador.name}: Removidos horários de almoço`);
        console.log(`   Antes: ${horariosAtuais.join(', ')}`);
        console.log(`   Depois: ${novosHorarios.join(', ')}`);
        atualizados++;
      } else {
        console.log(`⏭️  ${entrevistador.name}: Já não tem horários de almoço`);
      }
    }

    console.log('\n📊 Resumo:');
    console.log(`   Total de entrevistadores: ${entrevistadores.length}`);
    console.log(`   Atualizados: ${atualizados}`);
    console.log(`   Sem alteração: ${entrevistadores.length - atualizados}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
  }
}

removerHorariosAlmoco();
