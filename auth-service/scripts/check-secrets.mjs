import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const findings = [];
for (const file of files) {
  if (!/\.(?:ts|tsx|js|mjs|md|example)$/.test(file) || /\.spec\.ts$|\.e2e-spec\.ts$|package-lock/.test(file)) continue;
  let content;
  try { content = readFileSync(resolve(root, file), 'utf8'); } catch { continue; }
  content.split('\n').forEach((line, i) => {
    // Test fixtures and explicit placeholder values are not production credentials.
    if (/apt_[a-f0-9]{64}\b/.test(line) ||
        /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line) ||
        /(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(line) ||
        /postgres(?:ql)?:\/\/[^:]+:(?!postgres@|password@|PASSWORD@)[^@\s]+@/.test(line)) {
      findings.push(`${file}:${i + 1}`);
    }
  });
}
if (findings.length) {
  console.error('Possible committed secrets (values withheld):\n' + findings.join('\n'));
  process.exitCode = 1;
} else console.log('Tracked source secret-pattern check passed (not a history scan).');
