// Controller para gerenciamento de agendamentos
// Centraliza toda lógica de negócio relacionada aos agendamentos
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Log from '../models/Log.js';
import mongoose from 'mongoose';
import { validarCPF, validarTelefone } from '../utils/validators.js';
import { parseDate, isWeekend, formatDateTime, now } from '../utils/timezone.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

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
    const dataAgendamento = parseDate(data);
    if (isWeekend(dataAgendamento)) {
      return res.status(400).json({ message: 'Não é permitido agendar para sábado ou domingo.' });
    }
    
    // 🔒 PROTEÇÃO CONTRA RACE CONDITION
    // O índice único garante que apenas um agendamento seja criado
    // Se houver requisição simultânea, MongoDB retorna erro 11000
    let appointment;
    try {
      // Criação do novo agendamento com dados validados
      appointment = new Appointment({ 
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
      
    } catch (dbError) {
      // 🔒 Tratar erro de duplicata (código 11000 do MongoDB)
      if (dbError.code === 11000 || dbError.name === 'MongoServerError') {
        // Extrair informações do erro para mensagem amigável
        const dataFormatada = formatDateTime(data);
        return res.status(409).json({ 
          message: `Este horário (${dataFormatada}) já está ocupado para este entrevistador. Por favor, escolha outro horário.`,
          code: 'SLOT_TAKEN',
          field: 'data'
        });
      }
      // Re-lançar outros erros de banco
      throw dbError;
    }
    
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
      details: `Agendamento criado para ${pessoa} em ${formatDateTime(data)} - Motivo: ${motivo}`
    });
    
    // Invalidar cache após criação
    cache.invalidateAppointments(cras, entrevistador);
    
    res.status(201).json(appointmentPopulated.toJSON()); // toJSON() aplica getters
  } catch (err) {
    logger.error('Erro ao criar agendamento:', err, logger.sanitize({ request: req.body }));
    res.status(400).json({ message: 'Erro ao criar agendamento' });
  }
};

// Listar agendamentos (por CRAS, entrevistador, etc)
export const getAppointments = async (req, res) => {
  try {
    // Gerar chave de cache baseada nos parâmetros da requisição
    const cacheKey = cache.generateAppointmentKey({
      crasId: req.query.cras || req.user.cras?.toString(),
      entrevistadorId: req.query.entrevistador || (req.user.role === 'entrevistador' ? req.user.id : null),
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      pageSize: req.query.pageSize,
      sortBy: req.query.sortBy,
      order: req.query.order,
      role: req.user.role
    });
    
    // Função que executa a query (será chamada se cache miss)
    const fetchAppointments = async () => {
      const filter = {};
      
      // 🔒 SEGURANÇA: Aplicar filtros baseados no role ANTES de qualquer query
      // Previne acesso não autorizado a dados de outros CRAS/entrevistadores
      
      if (req.user.role === 'entrevistador') {
        // Entrevistador vê APENAS seus próprios agendamentos
        filter.entrevistador = req.user.id;
        // Ignorar completamente qualquer filtro do cliente
      } else if (req.user.role === 'recepcao') {
        // Recepção vê APENAS agendamentos do próprio CRAS
        const entrevistadoresDoCras = await User.find({ 
          cras: req.user.cras, 
          role: 'entrevistador' 
        }).select('_id');
        
        const idsEntrevistadores = entrevistadoresDoCras.map(user => user._id);
        
        if (idsEntrevistadores.length > 0) {
          filter.entrevistador = { $in: idsEntrevistadores };
        } else {
          return { results: [], total: 0 };
        }
        // Ignorar filtros do cliente para recepção
      } else if (req.user.role === 'admin') {
        // Admin pode filtrar por CRAS ou entrevistador específico
        if (req.query.cras) {
          const entrevistadoresDoCras = await User.find({ 
            cras: req.query.cras, 
            role: 'entrevistador' 
          }).select('_id');
          
          const idsEntrevistadores = entrevistadoresDoCras.map(user => user._id);
          
          if (idsEntrevistadores.length > 0) {
            filter.entrevistador = { $in: idsEntrevistadores };
          } else {
            return { results: [], total: 0 };
          }
        }
        
        // Admin pode filtrar por entrevistador específico
        if (req.query.entrevistador) {
          filter.entrevistador = req.query.entrevistador;
        }
      }

      // Sistema de busca global por texto
      // Permite buscar por nome, CPF ou telefones
      // 🔒 SEGURANÇA: Escapar caracteres especiais de regex para prevenir ReDoS
      if (req.query.search) {
        const search = req.query.search.trim();
        // Limitar tamanho da busca para prevenir ataques
        if (search.length > 100) {
          return { results: [], total: 0 };
        }
        // Escapar caracteres especiais de regex
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
          { pessoa: { $regex: escapedSearch, $options: 'i' } },     // Nome da pessoa
          { cpf: { $regex: escapedSearch, $options: 'i' } },        // CPF
          { telefone1: { $regex: escapedSearch, $options: 'i' } },  // Telefone principal
          { telefone2: { $regex: escapedSearch, $options: 'i' } }   // Telefone secundário
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

      // 🔒 LGPD: Descriptografia automática via getters do modelo
      // TODOS os usuários autenticados (admin, entrevistador, recepção) veem dados completos
      // Dados já descriptografados pelo toJSON() que aplica os getters do schema
      return { results, total };
    };
    
    // Executar query diretamente (cache desabilitado temporariamente para garantir dados frescos)
    const data = await fetchAppointments();
    
    res.json(data);
  } catch (error) {
    logger.error('Erro ao buscar agendamentos:', error, logger.sanitize({ request: req.body }));
    res.status(500).json({ message: 'Erro ao buscar agendamentos' });
  }
};

// Editar agendamento
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 🔒 SEGURANÇA: Whitelist de campos permitidos para atualização
    // Previne que campos como _id, createdAt, createdBy sejam modificados
    const allowedFields = [
      'entrevistador', 'cras', 'pessoa', 'cpf', 'telefone1', 'telefone2',
      'motivo', 'data', 'status', 'observacoes'
    ];
    
    const update = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }
    
    // Campos de auditoria sempre adicionados pelo servidor
    update.updatedBy = req.user.id;
    update.updatedAt = now();
    
    // 🔒 SEGURANÇA: Verificar ownership/autorização ANTES de atualizar
    const existingAppointment = await Appointment.findById(id);
    
    if (!existingAppointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    
    // Validar autorização baseada no role
    if (req.user.role === 'entrevistador') {
      // Entrevistador só pode editar seus próprios agendamentos
      if (existingAppointment.entrevistador.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Você não tem permissão para editar este agendamento' });
      }
    } else if (req.user.role === 'recepcao') {
      // Recepção só pode editar agendamentos do próprio CRAS
      const entrevistador = await User.findById(existingAppointment.entrevistador);
      if (!entrevistador || entrevistador.cras.toString() !== req.user.cras.toString()) {
        return res.status(403).json({ message: 'Você não tem permissão para editar agendamentos de outro CRAS' });
      }
    }
    // Admin pode editar qualquer agendamento
    
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
      details: `Agendamento editado para ${appointment.pessoa} em ${formatDateTime(appointment.data)}`
    });
    
    // Invalidar cache após atualização
    cache.invalidateAppointments(appointment.cras._id, appointment.entrevistador._id);
    
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
    
    // 🔒 SEGURANÇA: Verificar ownership/autorização ANTES de excluir
    if (req.user.role === 'entrevistador') {
      // Entrevistador só pode excluir seus próprios agendamentos
      if (appointment.entrevistador.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Você não tem permissão para excluir este agendamento' });
      }
    } else if (req.user.role === 'recepcao') {
      // Recepção só pode excluir agendamentos do próprio CRAS
      const entrevistador = await User.findById(appointment.entrevistador);
      if (!entrevistador || entrevistador.cras.toString() !== req.user.cras.toString()) {
        return res.status(403).json({ message: 'Você não tem permissão para excluir agendamentos de outro CRAS' });
      }
    }
    // Admin pode excluir qualquer agendamento
    
    // Converter para JSON para descriptografar
    const appointmentData = appointment.toJSON();
    
    await Appointment.findByIdAndDelete(id);
    
    // Criar log da ação
    await Log.create({
      user: req.user.id,
      cras: appointmentData.cras._id,
      action: 'excluir_agendamento',
      details: `Agendamento excluído de ${appointmentData.pessoa} em ${formatDateTime(appointmentData.data)}`
    });
    
    // Invalidar cache após exclusão
    cache.invalidateAppointments(appointmentData.cras._id, appointment.entrevistador);
    
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
    
    // 🔒 SEGURANÇA: Buscar e validar autorização ANTES de confirmar presença
    const existingAppointment = await Appointment.findById(id);
    
    if (!existingAppointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    
    // Validar autorização baseada no role
    if (req.user.role === 'entrevistador') {
      if (existingAppointment.entrevistador.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Você não tem permissão para confirmar presença neste agendamento' });
      }
    } else if (req.user.role === 'recepcao') {
      const entrevistador = await User.findById(existingAppointment.entrevistador);
      if (!entrevistador || entrevistador.cras.toString() !== req.user.cras.toString()) {
        return res.status(403).json({ message: 'Você não tem permissão para confirmar presença em agendamentos de outro CRAS' });
      }
    }
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { 
        status: 'realizado',
        updatedBy: req.user.id,
        updatedAt: now()
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
    
    // Invalidar cache após confirmação de presença
    cache.invalidateAppointments(appointmentPopulated.cras._id, appointmentPopulated.entrevistador._id);
    
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
    
    // 🔒 SEGURANÇA: Buscar e validar autorização ANTES de remover confirmação
    const existingAppointment = await Appointment.findById(id);
    
    if (!existingAppointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    
    // Validar autorização baseada no role
    if (req.user.role === 'entrevistador') {
      if (existingAppointment.entrevistador.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Você não tem permissão para remover confirmação deste agendamento' });
      }
    } else if (req.user.role === 'recepcao') {
      const entrevistador = await User.findById(existingAppointment.entrevistador);
      if (!entrevistador || entrevistador.cras.toString() !== req.user.cras.toString()) {
        return res.status(403).json({ message: 'Você não tem permissão para remover confirmação de agendamentos de outro CRAS' });
      }
    }
    
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
    
    // Invalidar cache após remover confirmação
    cache.invalidateAppointments(appointment.cras._id, appointment.entrevistador._id);
    
    res.json(appointment);
  } catch (error) {
    logger.error('Erro ao remover confirmação de presença:', error, logger.sanitize({ request: req.body }));
    res.status(400).json({ message: 'Erro ao remover confirmação de presença' });
  }
};
