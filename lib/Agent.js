'use strict';

class Agent {
  constructor(options = {}) {
    this.options = options;
    this.hostPath = options.hostPath;
    this.args = options.hostArguments || [];
    this.transform = options.transform || (x => x);
    this.out = options.out || '';

    if (typeof this.args === 'string') {
      this.args = this.args.includes(' ') ?
        this.args.split(' ').filter(v => v.trim()) :
        [this.args];
    }

    this.shortName = options.shortName || '$262';
  }

  compile(code, options) {
    options = options || {};

    if (!options.async) {
      code = `${code}\n;${this.shortName}.destroy();`;
    }

    code = this.transform(code, 1);

    return code;
  }

  // defaults that do nothing
  async initialize() { return this; }
  async destroy() {}
  stop() {}
}

module.exports = Agent;
