const resolveInMs = require('./resolveInMs');

class TestFactory {
  constructor(taskIntervalInMs = 5) {
    this.taskIntervalInMs = taskIntervalInMs;
    this.runningTasks = 0;
    this.created = [];
    this.validated = [];
    this.destroyed = [];
  }

  async _newTaskDelay() {
    this.runningTasks += 1;
    const delay = this.runningTasks * this.taskIntervalInMs;
    await resolveInMs(delay);
    this.runningTasks -= 1;
  }

  async create() {
    if (this.taskIntervalInMs) {
      await this._newTaskDelay();
    }

    const object = { id: this.created.length };
    this.created.push(object);
    return object;
  }

  async validate(object) {
    if (this.taskIntervalInMs) {
      await this._newTaskDelay();
    }
    this.validated.push(object);
    return !object.shouldFailValidate;
  }

  async destroy(object) {
    if (this.taskIntervalInMs) {
      await this._newTaskDelay();
    }
    this.destroyed.push(object);
    return !object.shouldFailDestroy;
  }
}

module.exports = TestFactory;
