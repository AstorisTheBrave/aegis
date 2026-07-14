import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const run = (command, args, cwd = root) => {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
};

run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'sdks/typescript/tsconfig.json']);
run('node', ['--test', 'sdks/typescript/test/manifest.test.mjs']);
run('go', ['test', './...'], `${root}sdks/go`);
run(
  process.platform === 'win32' ? 'py' : 'python3',
  ['-m', 'unittest', 'discover', '-s', 'test'],
  `${root}sdks/python`,
);
run('cargo', ['test'], `${root}sdks/rust`);
