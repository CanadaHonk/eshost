'use strict';

const fs = require('fs');
const path = require('path');
const isSymlink = require('is-symlink');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /(?:.*?): (\w+)(?:: (.*))?(?:\r?\nat[^\n]*)?(\r?\n.*@(\[native code\]|(?:.*:\d+:\d+)))*\r?\n/;

let DYLD_FRAMEWORK_PATH = process.env.DYLD_FRAMEWORK_PATH;

// JSC stack frame format:
// StackFrames: StackFrame+
// StackFrame: FunctionFrame | NativeFrame | EvalMarker
// FunctionFrame: (FunctionName`@`)?SourceInfo
// NativeFrame: (FunctionName`@`)?`[native code]`
// FunctionName: .*
// SourceInfo: File`:`Line`:`Column
// File: .*
// Line: \d+
// Column: \d+
// EvalMarker: `eval code`
const frameRe = /(?:(.*)@)?(\[native code\]|(?:(.*):(\d+):(\d+)))/;

function parseStack(stackStr) {
  stackStr = stackStr || '';
  const stack = [];

  const lines = stackStr.split(/\r?\n/g);
  lines.forEach(entry => {
    const match = entry.match(frameRe);
    if (match === null) {
      return;
    }

    stack.push({
      source: entry,
      functionName: (match[1] || '').trim(),
      fileName: match[3] || match[2],
      lineNumber: Number(match[4]),
      columnNumber: Number(match[5])
    });
  });

  // Add dummy frame if no stack frames are present in stack string.
  if (stack.length === 0) {
    stack.push({
      source: '',
      functionName: '',
      fileName: '',
      lineNumber: 1,
      columnNumber: 1
    });
  }

  return stack;
}

class JSCAgent extends ConsoleAgent {
  constructor(...args) {
    super(...args);

    /*
      See: https://webkit.org/running-webkit/

      This is frustrating, but necessary. DYLD_FRAMEWORK_PATH won't appear
      in process.env when node.js scripts are executed as binaries,
      ie. have a /usr/bin/env she-bang, because DYLD_* vars are excluded from env output

      $ export DYLD_FRAMEWORK_PATH="foo"
      $ node -pe process.env.DYLD_FRAMEWORK_PATH
      foo
      $ env | grep "DYLD_FRAMEWORK_PATH"
      (not found, nothing prints)


      Still not convinced? The following code shows that even WebKit's own run-jsc
      script must do this dance to ensure that DYLD_FRAMEWORK_PATH is set with the
      correct path for executing built-from-source jsc:

      - https://github.com/WebKit/WebKit/blob/main/Tools/Scripts/run-jsc#L60-L63
      - https://github.com/WebKit/WebKit/blob/main/Tools/Scripts/webkitdirs.pm#L2764-L2777
    */

    if (DYLD_FRAMEWORK_PATH === undefined) {
      if (isSymlink.sync(this.hostPath)) {
        let linked = fs.readlinkSync(this.hostPath);
        if (linked.includes('/WebKitBuild/')) {
          DYLD_FRAMEWORK_PATH = path.dirname(linked);
        }
      } else {
        if (this.hostPath.includes('/WebKitBuild/')) {
          DYLD_FRAMEWORK_PATH = path.dirname(this.hostPath);
        }
      }
    }

    this.cpOptions = {
      env: {
        DYLD_FRAMEWORK_PATH
      }
    };

    if (options.experimental) {
      // auto generated args
      this.args.unshift("--useTemporal=true", "--useShadowRealm=true");
    }
  }

  async evalScript(code, options = {}) {
    if (options.module && this.args[0] !== '-m') {
      this.args.unshift('-m');
    }

    if (!options.module && this.args[0] === '-m') {
      this.args.shift();
    }

    return super.evalScript(code, options);
  }

  parseError(str) {
    const match = str.match(errorRe);

    if (!match) {
      return null;
    }

    return {
      name: match[1],
      message: match[2],
      stack: parseStack(match[3])
    };
  }

  normalizeResult(result) {
    const match = result.stdout.match(errorRe);

    if (match) {
      result.stdout = result.stdout.replace(errorRe, '');
      result.stderr = match[0];
    }

    return result;
  }
}

JSCAgent.runtime = fs.readFileSync(runtimePath.for('jsc'), 'utf8');

module.exports = JSCAgent;
