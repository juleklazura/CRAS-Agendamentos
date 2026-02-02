/**
 * UserRepository - Camada de acesso a dados de usuários
 * 
 * @module repositories/UserRepository
 */

import User from '../models/User.js';

class UserRepository {
  async findById(id, select = null) {
    let query = User.findById(id);
    if (select) query = query.select(select);
    return query.exec();
  }

  async findOne(filter, select = null) {
    let query = User.findOne(filter);
    if (select) query = query.select(select);
    return query.exec();
  }

  async find(filter = {}, options = {}) {
    const { sort = { name: 1 }, select = null } = options;
    let query = User.find(filter).sort(sort);
    if (select) query = query.select(select);
    return query.exec();
  }

  async create(data) {
    const user = new User(data);
    return user.save();
  }

  async update(id, data) {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return User.findByIdAndDelete(id);
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }

  async findByMatricula(matricula) {
    return this.findOne({ matricula });
  }

  async findByCras(crasId, role = null) {
    const filter = { cras: crasId };
    if (role) filter.role = role;
    return this.find(filter);
  }

  async findByRole(role) {
    return this.find({ role });
  }

  async count(filter = {}) {
    return User.countDocuments(filter);
  }
}

export default new UserRepository();
