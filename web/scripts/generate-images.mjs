#!/usr/bin/env node
/**
 * Genera los assets fotográficos del sitio con OpenAI gpt-image-1.
 *
 * Uso (desde la raíz del repo):
 *   set -a; source .env; set +a
 *   node web/scripts/generate-images.mjs [--only <filtro>] [--force]
 *
 * - Idempotente: salta archivos que ya existen (salvo --force).
 * - Salida: web/public/img/... (servido por Next como /img/...).
 * - No imprime secretos; la key se toma de process.env.OPENAI_API_KEY.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.resolve(__dirname, "../public/img");

const PHOTO_STYLE =
  "Photorealistic professional beauty salon photography, shot on 35mm lens, " +
  "soft natural window light, warm upscale salon interior with plants and large mirrors, " +
  "Latin American clients and stylists, shallow depth of field, editorial quality, " +
  "true-to-life skin tones, no text, no watermark, no logo, no illustration.";

/** @type {{file:string, prompt:string, size:string, quality:string, format:string, background?:string}[]} */
const MANIFEST = [
  // ---- Marca ----
  {
    file: "logo.png",
    prompt:
      "Flat vector-style logo mark for a modern beauty salon and barbershop booking platform. " +
      "Minimalist abstract emblem combining a pair of open scissors with a flowing hair strand wave, " +
      "deep forest green #1f4d3a and warm terracotta #e36f4a, rounded geometric shapes, balanced, " +
      "premium brand identity, crisp clean edges, isolated icon, no text, no letters.",
    size: "1024x1024",
    quality: "high",
    format: "png",
    background: "transparent",
  },
  // ---- Hero ----
  {
    file: "hero.webp",
    prompt:
      "Wide interior shot of a modern upscale beauty salon and barbershop in Mexico: " +
      "a stylist blow-drying a woman's hair on the left, a barber finishing a fade on the right, " +
      "warm terracotta and deep green decor, arched mirrors with soft lighting, plants, " +
      "polished concrete floor, bright inviting atmosphere, candid editorial composition. " +
      PHOTO_STYLE,
    size: "1536x1024",
    quality: "high",
    format: "webp",
  },
  // ---- Servicios (mismo id que el seed) ----
  svc("seed-svc-corte", "A stylist cutting a woman's shoulder-length hair with scissors and comb, client wearing a salon cape, focused precise work."),
  svc("seed-svc-corte-dama", "A stylist finishing a woman's fresh haircut with a round brush and blow dryer, bouncy shiny blowout, happy client in salon chair."),
  svc("seed-svc-fade", "A barber carving a clean skin fade with clippers on a young Latino man, crisp line-up, modern barbershop chair."),
  svc("seed-svc-corte-barba", "A barber trimming and shaping a man's beard with a trimmer, fresh haircut, hot towel on the counter, classic barbershop mood."),
  svc("seed-svc-brushing", "A stylist doing a voluminous blowout on a woman with long hair, round brush and hairdryer, glossy movement in the hair."),
  svc("seed-svc-keratina", "A stylist flat-ironing a woman's long frizz-free hair after a keratin treatment, mirror-smooth shiny strands, steam-free clean look."),
  svc("seed-svc-botox", "A stylist applying a deep-repair hair mask to a woman's damp hair at a salon backwash station, glossy nourished hair, spa mood."),
  svc("seed-svc-color", "A colorist applying full hair dye with a tint brush and bowl, rich brunette color being worked through sections, gloves on."),
  svc("seed-svc-raiz", "Close-up of a root touch-up: colorist painting dye precisely along the part line of grown-out roots, foils aside, detailed hands."),
  svc("seed-svc-balayage", "A colorist hand-painting caramel balayage highlights freehand on a woman's long dark hair, sun-kissed blended sections."),
  svc("seed-svc-mechas", "A head full of highlight foils being woven by a colorist, silver foils pattern, classic salon highlights in progress."),
  svc("seed-svc-barba", "A barber detailing a man's full beard with a straight razor, sharp cheek lines, warm towel and balm nearby, moody barbershop light."),
  svc("seed-svc-afeitado", "A classic hot-towel straight razor shave: man reclined in a vintage barber chair, barber shaving with a steel razor, steam and ritual feel."),
  svc("seed-svc-unas", "A nail technician applying gel polish to a woman's nails, UV lamp glowing on the table, elegant neutral manicure tones."),
  svc("seed-svc-pedicure", "A relaxing spa pedicure: client's feet in a bubbling foot bath, technician exfoliating, towels and candles around."),
  svc("seed-svc-softgel", "A nail technician sculpting soft gel nail extensions with forms and a fine brush, natural almond shape, precise salon work."),
  svc("seed-svc-cejas", "An eyebrow design session: specialist shaping brows with threading technique, symmetrical clean result, close-up."),
  svc("seed-svc-laminado-cejas", "Brow lamination in progress: brushed-up fluffy eyebrows being set with product and a spoolie, modern brow studio look."),
  svc("seed-svc-pestanas", "A lash technician applying classic eyelash extensions with tweezers, client lying down with under-eye pads, macro detail."),
  svc("seed-svc-facial", "An express facial treatment: woman relaxed on a spa bed with a fresh cream mask, esthetician's hands, towels and soft light."),
  svc("seed-svc-makeup", "A makeup artist applying warm-toned eyeshadow with brushes for an evening event look, professional palette and brushes on the table."),
  svc("seed-svc-makeup-novia", "A bridal makeup session: makeup artist applying flawless long-wear makeup to a bride, soft glam look, elegant bright suite."),
];

function svc(id, subject) {
  return {
    file: `services/${id}.webp`,
    prompt: `${subject} ${PHOTO_STYLE}`,
    size: "1536x1024",
    quality: "medium",
    format: "webp",
  };
}

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const force = args.includes("--force");

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Falta OPENAI_API_KEY en el entorno (carga .env antes).");
  process.exit(1);
}

const jobs = MANIFEST.filter((j) => !only || j.file.includes(only));
const pending = jobs.filter((j) => force || !fs.existsSync(path.join(PUB, j.file)));

console.log(`Assets totales: ${MANIFEST.length} | seleccionados: ${jobs.length} | por generar: ${pending.length}`);
if (pending.length === 0) {
  console.log("Nada que hacer (todo existe; usa --force para regenerar).");
  process.exit(0);
}

async function generate(job, attempt = 1) {
  const body = {
    model: "gpt-image-1",
    prompt: job.prompt,
    size: job.size,
    quality: job.quality,
    output_format: job.format,
    ...(job.background ? { background: job.background } : {}),
  };
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt <= 4) {
      const wait = 15000 * attempt;
      console.warn(`  [${job.file}] HTTP ${res.status}; reintento ${attempt}/4 en ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
      return generate(job, attempt + 1);
    }
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("Respuesta sin b64_json");
  const out = path.join(PUB, job.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(b64, "base64"));
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`  OK ${job.file} (${kb} KB)`);
}

// Concurrencia acotada (3) para no topar rate limits.
const queue = [...pending];
let failures = 0;
async function worker() {
  while (queue.length) {
    const job = queue.shift();
    try {
      await generate(job);
    } catch (err) {
      failures++;
      console.error(`  FALLO ${job.file}: ${err.message}`);
    }
  }
}
await Promise.all([worker(), worker(), worker()]);

console.log(failures ? `Terminado con ${failures} fallos (re-ejecuta para reintentar).` : "Todo generado.");
process.exit(failures ? 1 : 0);
