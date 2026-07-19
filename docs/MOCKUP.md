# Mockup estático — Fase 1

**Objetivo:** visualizar el producto con diseño real, sin backend.  
**Salida:** pantallas navegables → base del [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) y [patterns/](./patterns/).

Estado: **`congelado` (referencia)** — v0.2.x.

| Área | Owner |
|------|--------|
| Cliente / público | Aprobado |
| Admin | Base OK; se retoca en la app real |
| Siguiente trabajo | Fase 3 (Next + Docker), no más mockup bloqueante |

**Cómo verlo:** abrir [`mockup/index.html`](../mockup/index.html) en el navegador.

### Shells UI (fuente de verdad estructural)

El mockup **define** tres áreas de chrome que la app debe respetar. Contrato:
[patterns/app-shells.md](./patterns/app-shells.md).

| Carpeta mockup | Shell | Chrome | App |
|----------------|-------|--------|-----|
| `mockup/publico/` | A | Top nav `.public-nav` | `app/(public)/` |
| `mockup/admin/` | B | Sidebar `.admin-shell` | `app/admin/` |
| `mockup/empleado/` | C | Sidebar (menú reducido) — **no** public-nav | `app/empleado/` |
| `mockup/super/` | B | Ítems de plataforma en admin | `/admin/plataforma` |

---

## 1. Principios del mockup

- 100% estático (HTML/CSS/JS o Next sin API).  
- Datos fake (sucursales, servicios, profesionales, horarios).  
- Español.  
- Look moderno, fresco, juvenil, unisex.  
- Responsive: móvil (cliente) + desktop (admin).  
- Incluir estados clave: vacío, seleccionado, confirmación.

---

## 2. Mapa de pantallas — Público / Cliente

| ID | Pantalla | Notas |
|----|----------|--------|
| P-01 | Home | Hero, CTAs “Agendar” / “Ver servicios”, trust |
| P-02 | Servicios | Categorías H/M/unisex, cards con imagen |
| P-03 | Detalle servicio | Descripción, duración, precio, CTA agendar |
| P-04 | Sucursales | Lista + **mapa** mock |
| P-05 | Detalle sucursal | Horario, servicios, cómo llegar |
| P-06 | Wizard cita — Sucursal | Paso 1 |
| P-07 | Wizard cita — Servicio | Paso 2 |
| P-08 | Wizard cita — Profesional | Paso 3 (fotos, rating mock) |
| P-09 | Wizard cita — Fecha/hora | Calendario + slots |
| P-10 | Wizard cita — Datos / prepago | Nombre + email o celular; toggle prepago/descuento |
| P-11 | Confirmación cita | Resumen + “añadir a calendario” mock |
| P-12 | Contacto | Form + WhatsApp / Facebook / email |
| P-13 | Login / Registro | Registro mínimo |
| P-14 | Mis citas | Lista + cancelar |
| P-15 | Reasignación (cliente) | 3 opciones: aceptar / reagendar / cancelar |

---

## 3. Mapa de pantallas — Admin (sidebar izquierdo)

| ID | Pantalla | Notas |
|----|----------|--------|
| A-01 | Dashboard | KPIs mock: citas hoy, ocupación, ingresos |
| A-02 | Citas | Tabla/calendario de todas |
| A-03 | Detalle cita | Reasignar, cancelar |
| A-04 | Servicios | CRUD visual mock |
| A-05 | Catálogo estilos | Galería cortes/uñas |
| A-06 | Sucursales | CRUD + mapa |
| A-07 | Personal | Lista empleados |
| A-08 | Detalle empleado | Horario, servicios, agenda |
| A-09 | Clientes | Lista mínima |
| A-10 | Asistencia | Checador / historial |
| A-11 | Comisiones | Tabla mock |
| A-12 | Reportes | Gráficas placeholder |
| A-13 | Config — General | |
| A-14 | Config — Correo (Resend) | Campos token enmascarados |
| A-15 | Config — Telegram | Token bot |
| A-16 | Config — Turnstile | Site + secret |
| A-17 | Config — Usuarios | Alta/baja |

---

## 4. Mapa de pantallas — Empleado

| ID | Pantalla | Notas |
|----|----------|--------|
| E-01 | Mi agenda hoy | Lista de citas + preparar material |
| E-02 | Mañana | Preview |
| E-03 | Checador | Entrada/salida |
| E-04 | Mis comisiones | Resumen |
| E-05 | Solicitar permiso | Con aviso si hay prepagadas |

---

## 5. Super Admin (opcional en mockup v1)

| ID | Pantalla |
|----|----------|
| S-01 | Lista de negocios (tenants) |
| S-02 | Alta de negocio |

Puede aplazarse a mockup v1.1 si se prioriza salón + cliente.

---

## 6. Prioridad de implementación del mockup

1. **P0:** P-01, P-02, P-04, P-06→P-11, P-12, A-01, A-02, sidebar shell, A-13→A-16  
2. **P1:** P-13, P-14, P-15, A-04, A-07, E-01  
3. **P2:** resto reportes, comisiones, super admin  

---

## 7. Contenido fake sugerido

- 3 sucursales demo (Monterrey / San Pedro / Cumbres, N.L.).  
- 8–12 servicios mixtos H/M.  
- 4–6 profesionales con fotos placeholder.  
- Slots de un día laborable de ejemplo.

---

## 8. Criterio de aceptación Fase 1

- [x] Navegación entre pantallas P0 sin errores  
- [x] Sidebar admin usable en desktop  
- [x] Wizard de cita cuenta la historia completa  
- [ ] Owner aprueba dirección visual  
- [x] Tokens/colores base en `mockup/assets/css/main.css` (formalizar en Design System F2)

**Release mockup:** `0.2.0`  
**Ruta:** [`mockup/`](../mockup/)

### Dirección visual actual (propuesta)

| Token | Valor | Uso |
|-------|-------|-----|
| Fondo | `#f6f3ee` crema | Lienzo público |
| Primary | `#1f4d3a` verde bosque | CTAs principales, admin acentos |
| Accent | `#e36f4a` terracota | Acciones de conversión (agendar) |
| Tipografía | Outfit (títulos) + DM Sans (cuerpo) | Unisex, moderna |

### Feedback del owner (rellenar)

- [ ] Me gusta la dirección general  
- [ ] Cambiar colores / tipografía  
- [ ] Faltan pantallas: _______________  
- [ ] Ajustar copy / flujos: _______________  
- [ ] Listo para Design System (F2) y luego código  

Al aprobar: marcar Fase 1 `hecha` y avanzar a [PHASES.md](./PHASES.md) Fase 2.
