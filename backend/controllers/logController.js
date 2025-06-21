import Log from '../models/Log.js';

export const createLog = async (req, res) => {
  try {
    const { action, details, cras } = req.body;
    const log = new Log({ user: req.user.id, cras, action, details });
    await log.save();
    res.status(201).json(log);
  } catch (_) {
    res.status(400).json({ message: 'Erro ao criar log' });
  }
};

export const getLogs = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'entrevistador') {
      filter.user = req.user.id;
    } else if (req.user.role === 'recepcao') {
      filter.cras = req.user.cras;
    } else if (req.query.cras) {
      filter.cras = req.query.cras;
    }
    const logs = await Log.find(filter).populate('user cras');
    res.json(logs);
  } catch (_) {
    res.status(500).json({ message: 'Erro ao buscar logs' });
  }
};
