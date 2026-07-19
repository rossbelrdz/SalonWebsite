# Guía de mapeo de imágenes — salon.freonx.org

Todas las imágenes son fotografía realista, luz cálida, paleta alineada al sitio
(crema #f6f3ee, terracota #e36f4a, verde bosque #1f4d3a), personas latinas en salón.

## Página de Inicio (/)
| Uso | Archivo | Ratio |
|---|---|---|
| Hero principal | `home/hero-home.png` | 16:9 (2048×1152) |
| Sección secundaria / ambiente | `home/interior-ambiente.jpg` | 16:9 (2048×1152) |

## Servicios populares (inicio) — reutiliza las imágenes de servicios
| Servicio | Archivo |
|---|---|
| Corte clásico unisex | `cabello/corte-clasico-unisex.jpg` |
| Balayage / babylights | `color/balayage.jpg` |
| Barba full / perfilado | `barba/barba-perfilado.jpg` |
| Manicure gel | `unas/manicure-gel.jpg` |
| Extensiones de pestañas clásicas | `spa/pestanas-clasicas.jpg` |
| Maquillaje social | `maquillaje/maquillaje-social.jpg` |

## Página de Servicios (/servicios)

### Cabello
| Servicio | Archivo |
|---|---|
| Botox capilar | `cabello/botox-capilar.jpg` |
| Brushing / peinado | `cabello/brushing-peinado.jpg` |
| Corte + barba | `cabello/corte-barba.jpg` |
| Corte clásico unisex | `cabello/corte-clasico-unisex.jpg` |
| Corte + peinado dama | `cabello/corte-peinado-dama.jpg` |
| Fade / degradado caballero | `cabello/fade-degradado.jpg` |
| Keratina express | `cabello/keratina-express.jpg` |

### Color
| Servicio | Archivo |
|---|---|
| Balayage / babylights | `color/balayage.jpg` |
| Mechas con foil | `color/mechas-foil.jpg` |
| Retoque de raíz | `color/retoque-raiz.jpg` |
| Tinte completo | `color/tinte-completo.jpg` |

### Barba
| Servicio | Archivo |
|---|---|
| Afeitado clásico navaja | `barba/afeitado-navaja.jpg` |
| Barba full / perfilado | `barba/barba-perfilado.jpg` |

### Uñas
| Servicio | Archivo |
|---|---|
| Manicure gel | `unas/manicure-gel.jpg` |
| Pedicure spa | `unas/pedicure-spa.jpg` |
| Soft gel / polygel | `unas/soft-gel.jpg` |

### Maquillaje
| Servicio | Archivo |
|---|---|
| Maquillaje de novia | `maquillaje/maquillaje-novia.jpg` |
| Maquillaje social | `maquillaje/maquillaje-social.jpg` |

### Spa
| Servicio | Archivo |
|---|---|
| Diseño de cejas | `spa/diseno-cejas.jpg` |
| Extensiones de pestañas clásicas | `spa/pestanas-clasicas.jpg` |
| Facial express | `spa/facial-express.jpg` |
| Laminado de cejas | `spa/laminado-cejas.jpg` |

## Notas técnicas
- **Fuentes** (este directorio): servicios 1536×924 (~5:3); hero/ambiente 2048×1022 (~2:1).
- **Publicadas en la app** (pipeline **sharp** → WebP):
  ```bash
  cd web && npm run images:optimize
  # = node scripts/optimize-salon-images.mjs
  ```
  - Servicios → `web/public/img/services/seed-svc-*.webp` — **1200×900 (4:3)** = `.media`
  - Hero → `web/public/img/home/hero.webp` — **1334×1000** ≈ panel `.hero-visual`
  - Interior → `web/public/img/home/interior.webp` (reserva)
  - Calidad WebP ~78; cover-crop centrado; ~−68% vs JPG fuente.
- Mapeo id de seed ↔ archivo: `seed-svc-corte` ← `cabello/corte-clasico-unisex.jpg`, etc.
- UI: `ServiceMedia` (`next/image` + sharp en prod) + `Service.imageUrl` en Prisma.
- Se recortó la franja inferior para eliminar la marca de agua del generador.
