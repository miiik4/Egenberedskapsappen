// Runs the real analysis on photos from your disk, against Vertex AI in the test project, and
// writes a contact sheet of what it found, for judging prompt and model changes on real rooms.
//
//   npm run build
//   node scripts/try-analysis.mjs [--video] [--travel] photo1.jpg photo2.jpg ...
//
// Needs `gcloud auth application-default login` with access to the test project. Nothing is
// stored anywhere; the photos go to Vertex AI only.
import { readFileSync, writeFileSync } from 'node:fs';

import sharp from 'sharp';

import { cropWindow } from '../lib/analysis/crop.js';
import { gemini } from '../lib/analysis/model.js';
import { runPipeline } from '../lib/analysis/pipeline.js';

const args = process.argv.slice(2);
const source = args.includes('--video') ? 'video' : 'photos';
const scene = args.includes('--travel') ? 'travel' : 'home';
const paths = args.filter((a) => !a.startsWith('--'));
if (paths.length === 0) {
  console.error('Usage: node scripts/try-analysis.mjs [--video] [--travel] photo.jpg ...');
  process.exit(1);
}

const model = gemini({
  project: process.env.PROJECT ?? 'egenberedskapsappen-test',
  location: process.env.ANALYSIS_LOCATION ?? 'europe-north1',
  analystModel: process.env.ANALYSIS_MODEL ?? 'gemini-2.5-pro',
  verifierModel: process.env.ANALYSIS_VERIFIER_MODEL ?? 'gemini-2.5-flash',
});

const frames = paths.map((p) => readFileSync(p));
const started = Date.now();
const items = await runPipeline(frames, source, scene, model, (line) => console.log(line));
console.log(`${items.length} things in ${((Date.now() - started) / 1000).toFixed(1)} s\n`);
for (const item of items) {
  const where = item.frame === undefined ? 'no picture' : `photo ${item.frame} (${paths[item.frame]})`;
  console.log(`- ${item.name} · ${item.category} · ${item.valueKr ?? '?'} kr · ${where}`);
}

// A contact sheet: each thing's crop, cut the way the phone will cut it.
const TILE = 240;
const tiles = [];
for (const item of items.filter((i) => i.frame !== undefined)) {
  const upright = await sharp(frames[item.frame]).rotate().toBuffer({ resolveWithObject: true });
  const w = cropWindow(item.box, upright.info.width, upright.info.height);
  tiles.push(
    await sharp(upright.data)
      .extract(w)
      .resize(TILE, TILE, { fit: 'contain', background: { r: 238, g: 243, b: 248 } })
      .jpeg()
      .toBuffer(),
  );
}
if (tiles.length > 0) {
  const columns = Math.min(5, tiles.length);
  const rows = Math.ceil(tiles.length / columns);
  const sheet = await sharp({ create: { width: columns * TILE, height: rows * TILE, channels: 3, background: '#ffffff' } })
    .composite(tiles.map((input, i) => ({ input, left: (i % columns) * TILE, top: Math.floor(i / columns) * TILE })))
    .jpeg()
    .toBuffer();
  writeFileSync('analysis-sheet.jpg', sheet);
  console.log(`\nContact sheet: analysis-sheet.jpg (${tiles.length} crops, in the order above)`);
}
