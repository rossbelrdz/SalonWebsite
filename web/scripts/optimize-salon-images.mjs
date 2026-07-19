#!/usr/bin/env node
/**
 * Recorta y optimiza las fotos del catálogo con sharp → WebP en public/img.
 *
 * Fuentes:  media/salon-images/  (raíz del monorepo)
 * Destino:  web/public/img/
 *
 * Uso (desde web/ o raíz):
 *   node web/scripts/optimize-salon-images.mjs
 *   npm run images:optimize
 *
 * Dimensiones (alineadas al design system):
 *   - servicios: 1200×900 (4:3)  → .media
 *   - hero:      1334×1000       → .hero-visual
 *   - interior:  1200×900        (reserva)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const SRC = path.join(REPO_ROOT, "media", "salon-images");
const OUT = path.join(WEB_ROOT, "public", "img");

const QUALITY = 78;
const EFFORT = 4; // webp effort 0–6

/** @type {{ id: string, rel: string }[]} */
const SERVICES = [
  { id: "seed-svc-corte", rel: "cabello/corte-clasico-unisex.jpg" },
  { id: "seed-svc-corte-dama", rel: "cabello/corte-peinado-dama.jpg" },
  { id: "seed-svc-fade", rel: "cabello/fade-degradado.jpg" },
  { id: "seed-svc-corte-barba", rel: "cabello/corte-barba.jpg" },
  { id: "seed-svc-brushing", rel: "cabello/brushing-peinado.jpg" },
  { id: "seed-svc-keratina", rel: "cabello/keratina-express.jpg" },
  { id: "seed-svc-botox", rel: "cabello/botox-capilar.jpg" },
  { id: "seed-svc-color", rel: "color/tinte-completo.jpg" },
  { id: "seed-svc-raiz", rel: "color/retoque-raiz.jpg" },
  { id: "seed-svc-balayage", rel: "color/balayage.jpg" },
  { id: "seed-svc-mechas", rel: "color/mechas-foil.jpg" },
  { id: "seed-svc-barba", rel: "barba/barba-perfilado.jpg" },
  { id: "seed-svc-afeitado", rel: "barba/afeitado-navaja.jpg" },
  { id: "seed-svc-unas", rel: "unas/manicure-gel.jpg" },
  { id: "seed-svc-pedicure", rel: "unas/pedicure-spa.jpg" },
  { id: "seed-svc-softgel", rel: "unas/soft-gel.jpg" },
  { id: "seed-svc-cejas", rel: "spa/diseno-cejas.jpg" },
  { id: "seed-svc-laminado-cejas", rel: "spa/laminado-cejas.jpg" },
  { id: "seed-svc-pestañas", rel: "spa/pestanas-clasicas.jpg" },
  { id: "seed-svc-facial", rel: "spa/facial-express.jpg" },
  { id: "seed-svc-makeup", rel: "maquillaje/maquillaje-social.jpg" },
  { id: "seed-svc-makeup-novia", rel: "maquillaje/maquillaje-novia.jpg" },
];

/**
 * Cover-crop to exact width×height, encode WebP.
 * @param {string} input
 * @param {string} output
 * @param {number} width
 * @param {number} height
 */
async function writeCoverWebp(input, output, width, height) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await sharp(input)
    .rotate() // honor EXIF
    .resize(width, height, { fit: "cover", position: "centre" })
    .webp({ quality: QUALITY, effort: EFFORT })
    .toFile(output);
  const meta = await sharp(output).metadata();
  const kb = Math.round(fs.statSync(output).size / 1024);
  return { w: meta.width, h: meta.height, kb };
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`No hay fuentes en ${SRC}`);
    console.error("Extrae media/salon-images.zip o coloca las JPG allí.");
    process.exit(1);
  }

  let totalIn = 0;
  let totalOut = 0;

  console.log("Servicios → public/img/services/*.webp (1200×900, 4:3)");
  for (const { id, rel } of SERVICES) {
    const input = path.join(SRC, rel);
    if (!fs.existsSync(input)) {
      console.warn(`  SKIP missing: ${rel}`);
      continue;
    }
    totalIn += fs.statSync(input).size;
    const output = path.join(OUT, "services", `${id}.webp`);
    const r = await writeCoverWebp(input, output, 1200, 900);
    totalOut += fs.statSync(output).size;
    // remove legacy jpg if present
    const legacy = path.join(OUT, "services", `${id}.jpg`);
    if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
    console.log(`  ${id}.webp  ${r.w}×${r.h}  ${r.kb} KB`);
  }

  console.log("Home → public/img/home/*.webp");
  for (const job of [
    { rel: "home/hero-home.jpg", out: "home/hero.webp", w: 1334, h: 1000 },
    { rel: "home/interior-ambiente.jpg", out: "home/interior.webp", w: 1200, h: 900 },
  ]) {
    const input = path.join(SRC, job.rel);
    if (!fs.existsSync(input)) {
      console.warn(`  SKIP missing: ${job.rel}`);
      continue;
    }
    totalIn += fs.statSync(input).size;
    const output = path.join(OUT, job.out);
    const r = await writeCoverWebp(input, output, job.w, job.h);
    totalOut += fs.statSync(output).size;
    const legacyJpg = output.replace(/\.webp$/, ".jpg");
    if (fs.existsSync(legacyJpg)) fs.unlinkSync(legacyJpg);
    console.log(`  ${job.out}  ${r.w}×${r.h}  ${r.kb} KB`);
  }

  const pct = totalIn ? Math.round((1 - totalOut / totalIn) * 100) : 0;
  console.log(
    `\nListo. Entrada ~${Math.round(totalIn / 1024)} KB → salida ~${Math.round(totalOut / 1024)} KB (−${pct}%).`,
  );
  console.log("Actualiza seed imageUrl a /img/services/*.webp si cambiaste extensión.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
