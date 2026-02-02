/**
 * LogRepository - Camada de acesso a dados de logs
 * 
 * @module repositories/LogRepository
 */

import Log from '../models/Log.js';

class LogRepository {
  async create(data) {
    return Log.create(data);
  }

  async find(filter = {}, options = {}) {
    const {
      sort = { createdAt: -1 },
      limit = 100,
      skip = 0,
      populate = true
    } = options;

    let query = Log.find(filter).sort(sort);

    if (populate) {
      query = query
        .populate('user', 'name email matricula')
        .populate('cras', 'nome');
    }

    if (skip > 0) query = query.skip(skip);
    if (limit) query = query.limit(limit);

    return query.exec();
  }

  async count(filter = {}) {
    return Log.countDocuments(filter);
  }

  async findByUser(userId, options = {}) {
    return this.find({ user: userId }, options);
  }

  async findByCras(crasId, options = {}) {
    return this.find({ cras: crasId }, options);
  }

  async findByAction(action, options = {}) {
    return this.find({ action }, options);
  }

  async findByDateRange(startDate, endDate, options = {}) {
    return this.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }, options);
  }
}

export default new LogRepository();
