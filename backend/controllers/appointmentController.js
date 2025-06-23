import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Agendar (Entrevistador, Recepção)
export const createAppointment = async (req, res) => {
  try {
    console.log('📝 Dados recebidos para criar agendamento:', req.body);
    console.log('👤 Usuário autenticado:', req.user);
    
    const { entrevistador, cras, pessoa, cpf, telefone1, telefone2, motivo, data, status, observacoes } = req.body;
    
    // Validar dados obrigatórios
    if (!entrevistador) {
      console.log('❌ Entrevistador não informado');
      return res.status(400).json({ message: 'Entrevistador é obrigatório' });
    }
    if (!mongoose.Types.ObjectId.isValid(entrevistador)) {
      console.log('❌ ID do entrevistador inválido:', entrevistador);
      return res.status(400).json({ message: 'ID do entrevistador é inválido' });
    }
    if (!cras) {
      console.log('❌ CRAS não informado');
      return res.status(400).json({ message: 'CRAS é obrigatório' });
    }
    if (!mongoose.Types.ObjectId.isValid(cras)) {
      console.log('❌ ID do CRAS inválido:', cras);
      return res.status(400).json({ message: 'ID do CRAS é inválido' });
    }
    if (!pessoa) {
      console.log('❌ Nome da pessoa não informado');
      return res.status(400).json({ message: 'Nome da pessoa é obrigatório' });
    }
    if (!cpf) {
      console.log('❌ CPF não informado');
      return res.status(400).json({ message: 'CPF é obrigatório' });
    }
    if (!telefone1) {
      console.log('❌ Telefone não informado');
      return res.status(400).json({ message: 'Telefone é obrigatório' });
    }
    if (!motivo) {
      console.log('❌ Motivo não informado');
      return res.status(400).json({ message: 'Motivo é obrigatório' });
    }
    if (!data) {
      console.log('❌ Data não informada');
      return res.status(400).json({ message: 'Data é obrigatória' });
    }
    
    // Validação: não permitir agendamento em sábado ou domingo
    const dataAgendamento = new Date(data);
    console.log('📅 Data do agendamento:', dataAgendamento);
    const diaSemana = dataAgendamento.getDay();
    if (diaSemana === 0 || diaSemana === 6) {
      console.log('❌ Tentativa de agendamento em fim de semana');
      return res.status(400).json({ message: 'Não é permitido agendar para sábado ou domingo.' });
    }
    
    console.log('✅ Todas as validações passaram, criando agendamento...');
    const appointment = new Appointment({ 
      entrevistador, 
      cras, 
      pessoa, 
      cpf, 
      telefone1, 
      telefone2, 
      motivo,
      data, 
      status, 
      observacoes, 
      createdBy: req.user.id 
    });
    
    console.log('💾 Salvando agendamento no banco...');
    await appointment.save();
    console.log('✅ Agendamento salvo com sucesso:', appointment._id);
    res.status(201).json(appointment);
  } catch (err) {
    console.error('❌ Erro ao criar agendamento:', err);
    res.status(400).json({ message: 'Erro ao criar agendamento', error: err.message });
  }
};

// Listar agendamentos (por CRAS, entrevistador, etc)
export const getAppointments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.cras) filter.cras = req.query.cras;
    if (req.query.entrevistador) filter.entrevistador = req.query.entrevistador;

    // Busca global
    if (req.query.search) {
      const search = req.query.search.trim();
      filter.$or = [
        { pessoa: { $regex: search, $options: 'i' } },
        { cpf: { $regex: search, $options: 'i' } },
        { telefone1: { $regex: search, $options: 'i' } },
        { telefone2: { $regex: search, $options: 'i' } }
      ];
    }

    // Ordenação
    let sort = {};
    if (req.query.sortBy) {
      let field = req.query.sortBy;
      if (["cras", "entrevistador", "createdBy"].includes(field)) {
        // Ordenação por campos populados: usar nome
        field = field + ".name";
      }
      sort[field] = req.query.order === 'desc' ? -1 : 1;
    } else {
      sort = { data: 1 };
    }

    // Total para paginação (sempre calcular antes da paginação)
    const total = await Appointment.countDocuments(filter);

    // Query principal
    let query = Appointment.find(filter)
      .populate('entrevistador cras createdBy')
      .sort(sort);
    
    let results = await query.exec();

    // Ordenação manual por campos populados (ex: entrevistador.name) - só se necessário
    if (req.query.sortBy && ["cras", "entrevistador", "createdBy"].includes(req.query.sortBy)) {
      const field = req.query.sortBy;
      const order = req.query.order === 'desc' ? -1 : 1;
      results = results.sort((a, b) => {
        const aName = a[field]?.name?.toLowerCase() || '';
        const bName = b[field]?.name?.toLowerCase() || '';
        if (aName < bName) return -1 * order;
        if (aName > bName) return 1 * order;
        return 0;
      });
    }

    // Paginação no frontend - aplicar slice nos resultados finais quando page E pageSize estiverem presentes
    if (
      req.query.page !== undefined &&
      req.query.pageSize !== undefined &&
      !isNaN(parseInt(req.query.page, 10)) &&
      !isNaN(parseInt(req.query.pageSize, 10))
    ) {
      const page = parseInt(req.query.page, 10);
      const pageSize = parseInt(req.query.pageSize, 10);
      const startIndex = page * pageSize;
      const endIndex = startIndex + pageSize;
      results = results.slice(startIndex, endIndex);
    }

    res.json({ results, total });
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ message: 'Erro ao buscar agendamentos' });
  }
};

// Editar agendamento
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    update.updatedBy = req.user.id;
    update.updatedAt = new Date();
    const appointment = await Appointment.findByIdAndUpdate(id, update, { new: true });
    res.json(appointment);
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(400).json({ message: 'Erro ao atualizar agendamento' });
  }
};

// Remover agendamento
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    await Appointment.findByIdAndDelete(id);
    res.json({ message: 'Agendamento removido' });
  } catch (error) {
    console.error('Erro ao remover agendamento:', error);
    res.status(400).json({ message: 'Erro ao remover agendamento' });
  }
};

// Confirmar presença
export const confirmPresence = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Confirmando presença para ID:', id);
    
    // Validar se o ID é válido
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'ID de agendamento inválido' });
    }
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { 
        status: 'realizado',
        updatedBy: req.user.id,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('entrevistador cras createdBy');
    
    if (!appointment) {
      console.log('Agendamento não encontrado para ID:', id);
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    
    console.log('Presença confirmada:', appointment);
    res.json(appointment);
  } catch (error) {
    console.error('Erro ao confirmar presença:', error);
    res.status(400).json({ message: 'Erro ao confirmar presença', error: error.message });
  }
};

// Remover confirmação de presença
export const removePresenceConfirmation = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { 
        status: 'agendado',
        updatedBy: req.user.id,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('entrevistador cras createdBy');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    
    res.json(appointment);
  } catch (error) {
    console.error('Erro ao remover confirmação de presença:', error);
    res.status(400).json({ message: 'Erro ao remover confirmação de presença' });
  }
};
