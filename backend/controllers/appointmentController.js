// Controller para gerenciamento de agendamentos
// Centraliza toda lógica de negócio relacionada aos agendamentos
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Log from '../models/Log.js';
import mongoose from 'mongoose';
import { validarCPF, validarTelefone } from '../utils/validators.js';

// Função para criar novo agendamento (Entrevistador, Recepção)
// Realiza validações rigorosas antes de persistir no banco
export const createAppointment = async (req, res) => {
  try {
    const { entrevistador, cras, pessoa, cpf, telefone1, telefone2, motivo, data, status, observacoes } = req.body;
    
    // Validações de dados obrigatórios
    // Cada validação retorna erro específico para melhor UX
    if (!entrevistador) {
      return res.status(400).json({ message: 'Entrevistador é obrigatório' });
    }
    if (!mongoose.Types.ObjectId.isValid(entrevistador)) {
      return res.status(400).json({ message: 'ID do entrevistador é inválido' });
    }
    if (!cras) {
      return res.status(400).json({ message: 'CRAS é obrigatório' });
    }
    if (!mongoose.Types.ObjectId.isValid(cras)) {
      return res.status(400).json({ message: 'ID do CRAS é inválido' });
    }
    if (!pessoa) {
      return res.status(400).json({ message: 'Nome da pessoa é obrigatório' });
    }
    if (!cpf) {
      return res.status(400).json({ message: 'CPF é obrigatório' });
    }
    
    // Validação matemática do CPF
    if (!validarCPF(cpf)) {
      return res.status(400).json({ message: 'CPF inválido. Verifique os dígitos e tente novamente.' });
    }
    
    if (!telefone1) {
      return res.status(400).json({ message: 'Telefone é obrigatório' });
    }
    
    // Validação do telefone principal
    if (!validarTelefone(telefone1)) {
      return res.status(400).json({ message: 'Telefone inválido. Use o formato (XX) XXXXX-XXXX' });
    }
    
    // Validação do telefone secundário (se fornecido)
    if (telefone2 && !validarTelefone(telefone2)) {
      return res.status(400).json({ message: 'Telefone 2 inválido. Use o formato (XX) XXXXX-XXXX' });
    }
    
    if (!motivo) {
      return res.status(400).json({ message: 'Motivo é obrigatório' });
    }
    if (!data) {
      return res.status(400).json({ message: 'Data é obrigatória' });
    }
    
    // Validação de regra de negócio: não permitir agendamento em fins de semana
    const dataAgendamento = new Date(data);
    const diaSemana = dataAgendamento.getDay();
    if (diaSemana === 0 || diaSemana === 6) {
      return res.status(400).json({ message: 'Não é permitido agendar para sábado ou domingo.' });
    }
    
    // Criação do novo agendamento com dados validados
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
    
    await appointment.save();
    
    // Carregar agendamento com dados relacionados para retornar completo
    const appointmentPopulated = await Appointment.findById(appointment._id)
      .populate('entrevistador', 'name email matricula')
      .populate('cras', 'nome endereco telefone')
      .populate('createdBy', 'name matricula');
    
    // Criar log da ação
    await Log.create({
      user: req.user.id,
      cras: cras,
      action: 'criar_agendamento',
      details: `Agendamento criado para ${pessoa} em ${new Date(data).toLocaleString('pt-BR')} - Motivo: ${motivo}`
    });
    
    res.status(201).json(appointmentPopulated.toJSON()); // toJSON() aplica getters
  } catch (err) {
    logger.error('Erro ao criar agendamento:', err, logger.sanitize({ request: req.body }));
    res.status(400).json({ message: 'Erro ao criar agendamento' });
  }
};

// Listar agendamentos (por CRAS, entrevistador, etc)
export const getAppointments = async (req, res) => {
  try {
    const filter = {};
    
    // Se filtrar por CRAS, buscar todos os entrevistadores desse CRAS
    if (req.query.cras) {
      // Buscar todos os entrevistadores do CRAS especificado
      const entrevistadoresDoCras = await User.find({ 
        cras: req.query.cras, 
        role: 'entrevistador' 
      }).select('_id');
      
      const idsEntrevistadores = entrevistadoresDoCras.map(user => user._id);
      
      if (idsEntrevistadores.length > 0) {
        filter.entrevistador = { $in: idsEntrevistadores };
      } else {
        // Se não há entrevistadores no CRAS, retornar lista vazia
        return res.json({ results: [], total: 0 });
      }
    }
    
    // Filtro por entrevistador específico (se fornecido)
    if (req.query.entrevistador) filter.entrevistador = req.query.entrevistador;

    // Sistema de busca global por texto
    // Permite buscar por nome, CPF ou telefones
    if (req.query.search) {
      const search = req.query.search.trim();
      filter.$or = [
        { pessoa: { $regex: search, $options: 'i' } },     // Nome da pessoa
        { cpf: { $regex: search, $options: 'i' } },        // CPF
        { telefone1: { $regex: search, $options: 'i' } },  // Telefone principal
        { telefone2: { $regex: search, $options: 'i' } }   // Telefone secundário
      ];
    }

    // Sistema de ordenação dinâmica
    let sort = {};
    if (req.query.sortBy) {
      let field = req.query.sortBy;
      // Para campos relacionados, ordena pelo nome do objeto populado
      if (["cras", "entrevistador", "createdBy"].includes(field)) {
        field = field + ".name";
      }
      sort[field] = req.query.order === 'desc' ? -1 : 1;
    } else {
      // Ordenação padrão por data
      sort = { data: 1 };
    }

    // Calcula total de registros para paginação (antes de aplicar limit/skip)
    const total = await Appointment.countDocuments(filter);

    // Query principal com população de dados relacionados
    let query = Appointment.find(filter)
      .populate('entrevistador', 'name email matricula') // Campos específicos do entrevistador
      .populate('cras', 'nome endereco telefone')        // Campos específicos do CRAS
      .populate('createdBy', 'name matricula')          // Campos específicos de quem criou
      .sort(sort);
    
    let results = await query.exec();
    
    // Converter para JSON para aplicar getters e descriptografar
    results = results.map(doc => doc.toJSON());

    // Ordenação manual para campos populados (necessaria devido à limitação do MongoDB)
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
    logger.error('Erro ao buscar agendamentos:', error, logger.sanitize({ request: req.body }));
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
    
    await Appointment.findByIdAndUpdate(id, update, { new: true });
    
    // Buscar agendamento atualizado com dados populados e descriptografados
    const appointment = await Appointment.findById(id)
      .populate('entrevistador', 'name email matricula')
      .populate('cras', 'nome endereco telefone')
      .populate('createdBy', 'name matricula')
      .populate('updatedBy', 'name matricula');
    
    // Criar log da ação
    await Log.create({
      user: req.user.id,
      cras: appointment.cras._id,
      action: 'editar_agendamento',
      details: `Agendamento editado para ${appointment.pessoa} em ${new Date(appointment.data).toLocaleString('pt-BR')}`
    });
    
    res.json(appointment.toJSON()); // toJSON() aplica getters
  } catch (error) {
    logger.error('Erro ao atualizar agendamento:', error, logger.sanitize({ request: req.body }));
    res.status(400).json({ message: 'Erro ao atualizar agendamento' });
  }
};

// Remover agendamento
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar dados do agendamento antes de excluir para o log (com descriptografia)
    const appointment = await Appointment.findById(id)
      .populate('cras', 'nome');
      
    if (!appointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    
    // Converter para JSON para descriptografar
    const appointmentData = appointment.toJSON();
    
    await Appointment.findByIdAndDelete(id);
    
    // Criar log da ação
    await Log.create({
      user: req.user.id,
      cras: appointmentData.cras._id,
      action: 'excluir_agendamento',
      details: `Agendamento excluído de ${appointmentData.pessoa} em ${new Date(appointmentData.data).toLocaleString('pt-BR')}`
    });
    
    res.json({ message: 'Agendamento removido' });
  } catch (error) {
    logger.error('Erro ao remover agendamento:', error, logger.sanitize({ request: req.body }));
    res.status(400).json({ message: 'Erro ao remover agendamento' });
  }
};

// Confirmar presença
export const confirmPresence = async (req, res) => {
  try {
    const { id } = req.params;
    
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
    );
    
    if (!appointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    
    // Buscar com população e descriptografia
    const appointmentPopulated = await Appointment.findById(id)
      .populate('entrevistador', 'name email matricula')
      .populate('cras', 'nome endereco telefone')
      .populate('createdBy', 'name matricula')
      .populate('updatedBy', 'name matricula');
    
    res.json(appointmentPopulated.toJSON()); // toJSON() aplica getters
  } catch (error) {
    logger.error('Erro ao confirmar presença:', error, logger.sanitize({ request: req.body }));
    res.status(400).json({ message: 'Erro ao confirmar presença' });
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
    logger.error('Erro ao remover confirmação de presença:', error, logger.sanitize({ request: req.body }));
    res.status(400).json({ message: 'Erro ao remover confirmação de presença' });
  }
};
