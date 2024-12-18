var $262 = {
  global: globalThis,
  gc() {
    throw new Test262Error("gc() not yet supported.");
  },
  createRealm(options) {
    throw new Test262Error("createRealm() not yet supported.");
  },
  evalScript(code) {
    throw new Test262Error("evalScript() not yet supported.");
  },
  getGlobal(name) {
    return this.global[name];
  },
  setGlobal(name, value) {
    this.global[name] = value;
  },
  destroy() {
    /* noop */
  },
  IsHTMLDDA: {},
  source: $SOURCE,
  get agent() {
    throw new Test262Error("agent.* not yet supported.");
  },
};
