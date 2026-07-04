const { spawn } = require('node:child_process');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, process.argv.slice(2), {
  stdio: 'inherit',
  env,
  windowsHide: false
});

child.on('exit', code => process.exit(code ?? 0));
child.on('error', error => {
  console.error(error);
  process.exit(1);
});
