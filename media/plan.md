# Plan — Imágenes realistas para salon.freonx.org

## Contexto
Sitio: https://salon.freonx.org/ (Next.js, "Demo Beauty Group")
Páginas: Inicio (hero + servicios populares) y /servicios (22 servicios en 6 categorías)
Paleta del sitio: crema cálido #f6f3ee, terracota #e36f4a, verde bosque #1f4d3a
Requisito del usuario: fotos REALISTAS, con PERSONAS dentro de un salón, que reflejen la descripción de cada servicio.

## Etapa 1 — Preparación (hecha)
- [x] Analizar home y /servicios: extraer lista de servicios y descripciones
- [x] Extraer paleta de colores del CSS
- [ ] Leer skill image_generation y cargar herramienta MCP

## Etapa 2 — Generación de imágenes (paralela con subagentes)
Estilo global consistente: fotografía realista, luz cálida natural, salón elegante moderno
con acentos terracota y verde bosque, estética latina/mexicana (MTY), alta calidad editorial.

Entregables (23 imágenes, JPG):
1. hero-home.jpg — 16:9 2K — escena amplia del salón con estilista y clienta
2. Cabello (7): botox-capilar, brushing, corte-barba, corte-unisex, corte-dama, fade, keratina
3. Color (4): balayage, mechas-foil, retoque-raiz, tinte-completo
4. Barba (2): afeitado-navaja, barba-perfilado
5. Uñas (3): manicure-gel, pedicure-spa, soft-gel
6. Maquillaje (2): maquillaje-novia, maquillaje-social
7. Spa (4): diseno-cejas, pestanas-clasicas, facial-express, laminado-cejas

División: 4 subagentes en paralelo, cada uno con su lista + prompts detallados en inglés.
Salida: /mnt/agents/output/salon-images/{categoria}/{nombre}.jpg

## Etapa 3 — Validación e integración
- Verificar que todas las imágenes existen y pesan >0
- Revisión visual rápida de muestras
- Empaquetar en ZIP + guía de mapeo (qué imagen va en qué servicio)
