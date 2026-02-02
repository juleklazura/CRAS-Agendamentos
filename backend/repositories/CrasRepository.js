/**
 * CrasRepository - Camada de acesso a dados de CRAS
 * 
 * @module repositories/CrasRepository
 */

import Cras from '../models/Cras.js';

class CrasRepository {
  async findById(id) {
    return Cras.findById(id);
  }

  async find(filter = {}) {
    return Cras.find(filter).sort({ nome: 1 });
  }

  async create(data) {
    const cras = new Cras(data);
    return cras.save();
  }

  async update(id, data) {
    return Cras.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return Cras.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return Cras.countDocuments(filter);
  }

  async findActive() {
    return this.find({ ativo: true });
  }
}

export default new CrasRepository();
