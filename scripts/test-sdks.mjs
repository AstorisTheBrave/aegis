import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
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

const clang = process.platform === 'win32' ? 'C:/Program Files/LLVM/bin/clang.exe' : 'clang';
const clangxx = process.platform === 'win32' ? 'C:/Program Files/LLVM/bin/clang++.exe' : 'clang++';
const nativeAvailable = process.platform !== 'win32' || (existsSync(clang) && existsSync(clangxx));
if (!nativeAvailable) {
  console.log('C/C++ SDK checks skipped: no native compiler is installed.');
} else {
  const output = `${root}sdks/.native-test`;
  rmSync(output, { recursive: true, force: true });
  run(clang, [
    '-std=c11',
    '-Isdks/c/include',
    'sdks/c/src/aegis_connector.c',
    'sdks/c/test/connector_test.c',
    '-o',
    `${output}-c`,
  ]);
  run(`${output}-c`, []);
  run(clangxx, [
    '-std=c++17',
    '-Isdks/cpp/include',
    'sdks/cpp/test/connector_test.cpp',
    '-o',
    `${output}-cpp`,
  ]);
  run(`${output}-cpp`, []);
  rmSync(`${output}-c${process.platform === 'win32' ? '.exe' : ''}`, { force: true });
  rmSync(`${output}-cpp${process.platform === 'win32' ? '.exe' : ''}`, { force: true });
}
