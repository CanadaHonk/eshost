'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');
const ErrorParser = require('../parse-error.js');

const errorexp = /(.*?): (.*)(\n(\s*)at (.+))*/gm;
const customexp = /^(\w+):? ?(.*)$/gm;

class GraalJSAgent extends ConsoleAgent {
  constructor(options) {
    super(options);

    this.args.unshift(
      '--experimental-options',
      '--js.test262-mode=true'
    );

    if (options.experimental) {
      this.args.unshift(
        '--js.ecmascript-version=staging',
        '--js.temporal=true'
      );
    }
  }

  async evalScript(code, options = {}) {
    if (options.module && this.args[this.args.length - 1] !== '--module') {
      this.args.push('--module');
    }

    if (!options.module && this.args[this.args.length - 1] === '--module') {
      this.args.pop();
    }

    return super.evalScript(code, options);
  }

  parseError(str) {
    errorexp.lastIndex = -1;
    customexp.lastIndex = -1;

    const ematch = errorexp.exec(str);
    const cmatch = customexp.exec(str);

    // If the full error expression has a match with a stack,
    // use that as the match object.
    const hasStack = ematch && (ematch[3] && ematch[3].trim() !== '');
    const match = hasStack
      ? ematch
      : cmatch;

    if (!match) {
      return null;
    }

    const stackStr = match[3] || '';

    let stack;
    if (hasStack) {
      stack = ErrorParser.parseStack(stackStr.trim());
    } else {
      stack = [];
    }

    return {
      name: match[1],
      message: match[2],
      stack: stack,
    };
  }

  normalizeResult(result) {
    const match = result.stdout.match(errorexp);

    if (match) {
      result.stdout = result.stdout.replace(errorexp, '');
      result.stderr = match[0];
    }

    return result;
  }
}

GraalJSAgent.runtime = fs.readFileSync(runtimePath.for('graaljs'), 'utf8');

module.exports = GraalJSAgent;
