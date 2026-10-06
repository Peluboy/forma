import { mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve(process.env.OCR_LANG_PATH || '.data/tessdata');
await mkdir(directory, { recursive: true });
const response = await fetch('https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz', { signal: AbortSignal.timeout(60000) });
if (!response.ok) throw new Error(`Language download failed (${response.status})`);
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length < 100000 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw new Error('Invalid language archive');
await writeFile(resolve(directory, 'eng.traineddata.gz.tmp'), bytes);
await rename(resolve(directory, 'eng.traineddata.gz.tmp'), resolve(directory, 'eng.traineddata.gz'));
console.log(`English OCR assets installed in ${directory}`);
