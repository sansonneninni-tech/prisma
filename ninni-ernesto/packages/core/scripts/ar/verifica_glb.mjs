// Verifica i GLB con il validatore ufficiale Khronos (npm: gltf-validator).
// Uso: node verifica_glb.mjs [cartella]   (default: ../../../../assets/ar)
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import validator from 'gltf-validator';

const qui = dirname(fileURLToPath(import.meta.url));
const cartella = resolve(process.argv[2] ?? join(qui, '../../../../assets/ar'));
const files = readdirSync(cartella).filter((f) => f.endsWith('.glb')).sort();
let falliti = 0;
for (const f of files) {
  const r = await validator.validateBytes(new Uint8Array(readFileSync(join(cartella, f))), { uri: f });
  const { numErrors, numWarnings, numInfos } = r.issues;
  console.log(`${numErrors ? '✗' : '✓'} ${f}: errori ${numErrors}, avvisi ${numWarnings}, info ${numInfos}`);
  for (const m of r.issues.messages.filter((m) => m.severity <= 1)) console.log(`    [${m.severity ? 'avviso' : 'ERRORE'}] ${m.code} ${m.message} ${m.pointer ?? ''}`);
  if (numErrors) falliti++;
}
console.log(`${files.length} GLB controllati, ${falliti} con errori`);
process.exit(falliti ? 1 : 0);
