# Investigación: comisiones en salones y barberías

**Estado:** modelo provisional implementado (F8 / v0.11.0).  
**Objetivo:** documentar el cálculo actual y el camino a un modelo más fino.

---

## 1. Modelo en producción (provisional)

| Pieza | Detalle |
|-------|---------|
| Base | `priceCents` de la cita |
| Estados que cuentan | `CONFIRMED`, `PREPAID`, `COMPLETED` |
| % | `EmployeeProfile.commissionPct` (default 40; seed: Leo 40%, María 45%) |
| Fórmula | `round(servicesCents * pct / 100)` |
| Periodo UI empleado | Quincena actual + hoy / ayer / 7 días |
| Periodo UI admin | Quincena actual (query `?from=&to=`) |
| Default tenant | `TenantSettings.defaultCommissionPct` (40) |

**No incluido aún:** propinas, productos retail, booth rental, escalones por volumen, comisión sobre neto post-descuento distinto del `priceCents` ya guardado.

---

## 2. Pantallas

| Rol | Ruta |
|-----|------|
| Empleado | `/empleado/comisiones` |
| Admin | `/admin/comisiones` (+ editar %) |

Permisos RBAC: `staff.commissions.own` / `staff.commissions.all`.

---

## 3. Sistemas de referencia (para evolución)

Fresha, Booker/Mindbody, Vagaro, Square Appointments, Zenoti, GlossGenius — típico: % por servicio o categoría, liquidación semanal/quincenal, propinas aparte.

### Modelos candidatos a futuro

| Modelo | Descripción |
|--------|-------------|
| A | % fijo por servicio (actual = global por empleado) |
| B | % por categoría / por empleado |
| C | Fijo + % |
| D | Booth rental |

Recomendación actual: **A** (simple, operable). Evolucionar a **B** si un tenant lo pide.

---

## 4. Checklist de investigación profunda (opcional)

- [ ] Tabla comparativa Top 10–15  
- [ ] Decisión formal A/B/C/D por mercado LATAM  
- [ ] Propinas y productos  
- [ ] Liquidación exportable (CSV / nómina)
