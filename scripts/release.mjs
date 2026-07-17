import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const packageRoots = ['apps', 'connectors', 'packages'];

const command = process.argv[2] ?? 'verify';
const tag = process.argv[3] ?? process.env.GITHUB_REF_NAME;
if (command !== 'verify') throw new Error(`Unknown release command: ${command}`);

const rootPackage = await readJson('package.json');
const version = rootPackage.version;
if (typeof version !== 'string' || !semver.test(version)) {
  throw new Error(
    `Root package version must be a stable SemVer version, received ${String(version)}`,
  );
}

if (!tag) throw new Error('A release tag is required');
if (tag !== `v${version}`) {
  throw new Error(`Release tag ${tag} must exactly match package version v${version}`);
}

for (const directory of packageRoots) {
  for (const name of await readdir(resolve(root, directory), { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const packagePath = `${directory}/${name.name}/package.json`;
    const manifest = await readJson(packagePath);
    if (manifest.version !== version) {
      throw new Error(`${packagePath} must declare version ${version}`);
    }
  }
}

for (const [path, expression] of [
  ['sdks/typescript/package.json', /"version":\s*"([^"]+)"/],
  ['sdks/python/pyproject.toml', /^version = "([^"]+)"$/m],
  ['sdks/rust/Cargo.toml', /^version = "([^"]+)"$/m],
]) {
  const content = await readFile(resolve(root, path), 'utf8');
  if (content.match(expression)?.[1] !== version) {
    throw new Error(`${path} must declare version ${version}`);
  }
}

const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8');
if (!changelog.includes(`## [${version}]`)) {
  throw new Error(`CHANGELOG.md must contain a ${version} release entry`);
}

console.log(`Release ${tag} is internally consistent.`);

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}
