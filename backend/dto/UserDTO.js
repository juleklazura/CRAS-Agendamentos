/**
 * UserDTO - DTOs para operações de usuários
 * 
 * @module dto/UserDTO
 */

/**
 * DTO para criação de usuário
 */
export class CreateUserDTO {
  constructor(data) {
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.matricula = data.matricula;
    this.role = data.role;
    this.cras = data.cras;
  }

  validate() {
    const errors = [];

    const requiredFields = ['name', 'email', 'password', 'matricula', 'role', 'cras'];

    requiredFields.forEach(field => {
      if (!this[field]) {
        errors.push({
          field,
          message: `${field} é obrigatório`
        });
      }
    });

    // Validar role
    const validRoles = ['admin', 'recepcao', 'entrevistador'];
    if (this.role && !validRoles.includes(this.role)) {
      errors.push({
        field: 'role',
        message: 'Role inválido'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toObject() {
    return {
      name: this.name,
      email: this.email,
      password: this.password,
      matricula: this.matricula,
      role: this.role,
      cras: this.cras
    };
  }
}

/**
 * DTO para atualização de usuário
 */
export class UpdateUserDTO {
  constructor(data) {
    if (data.name !== undefined) this.name = data.name;
    if (data.email !== undefined) this.email = data.email;
    if (data.password !== undefined) this.password = data.password;
    if (data.matricula !== undefined) this.matricula = data.matricula;
    if (data.role !== undefined) this.role = data.role;
    if (data.cras !== undefined) this.cras = data.cras;
  }

  toObject() {
    const obj = {};
    
    Object.keys(this).forEach(key => {
      if (this[key] !== undefined) {
        obj[key] = this[key];
      }
    });

    return obj;
  }
}

/**
 * DTO para resposta de usuário (sem senha)
 */
export class UserResponseDTO {
  constructor(user) {
    this._id = user._id;
    this.name = user.name;
    this.email = user.email;
    this.matricula = user.matricula;
    this.role = user.role;
    this.cras = this._formatCras(user.cras);
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  _formatCras(cras) {
    if (!cras) return null;
    
    if (typeof cras === 'object' && cras.nome) {
      return {
        _id: cras._id,
        nome: cras.nome
      };
    }
    
    return cras;
  }

  toJSON() {
    return { ...this };
  }
}

/**
 * DTO para login
 */
export class LoginDTO {
  constructor(data) {
    this.email = data.email;
    this.password = data.password;
  }

  validate() {
    const errors = [];

    if (!this.email) {
      errors.push({ field: 'email', message: 'Email é obrigatório' });
    }

    if (!this.password) {
      errors.push({ field: 'password', message: 'Senha é obrigatória' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toObject() {
    return {
      email: this.email,
      password: this.password
    };
  }
}
