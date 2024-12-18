'use strict';

const fs = require('fs');
const runtimePath = require('../runtime-path');
const ConsoleAgent = require('../ConsoleAgent');

class JawsmAgent extends ConsoleAgent {
}

JawsmAgent.runtime = fs.readFileSync(runtimePath.for('jawsm'), 'utf8');

module.exports = JawsmAgent;
