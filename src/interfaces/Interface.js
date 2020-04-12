class Interface {
  constructor(name = 'object', types = {}) {
    this.name = name;
    this.types = { ...types };
  }

  validate(object) {
    Interface.validateTypes(this.types, object, this.name);
  }

  static validateTypes(types, object, name = 'object') {
    if (!object || typeof object !== 'object') throw new TypeError(`${name} is not valid`);
    Reflect.ownKeys(types).forEach(key => {
      const type = typeof object[key];
      const expectedTypes = types[key].split('|');
      if (!expectedTypes.includes(type)) {
        throw new TypeError(`${name}.${String(key)} should be a ${expectedTypes.join(' or ')}`);
      }
    });
  }
}

module.exports = Interface;
