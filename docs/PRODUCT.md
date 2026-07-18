# Producto

Entendimiento funcional del negocio. UI en **español**.  
Arquitectura: [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Propuesta de valor

Plataforma para **salones de belleza y barberías** que permite:

- Mostrar servicios, sucursales y contacto.  
- Agendar citas eligiendo **profesional concreto**.  
- Reducir no-shows con **prepago + descuento**.  
- Operar el negocio: personal, checador, comisiones, reportes.  
- Gestionar incidencias: reasignación, cancelación, reembolso.

---

## 2. Actores

| Actor | Descripción |
|-------|-------------|
| Visitante | Navega mock/público sin cuenta |
| Cliente | Cuenta mínima; agenda y gestiona sus citas |
| Empleado | Atiende servicios; ve su agenda; checa asistencia |
| Admin | Administra un negocio (tenant) |
| Super Admin | Administra la plataforma (todos los tenants) |

Roles y UI: [ROLES_AND_UI.md](./ROLES_AND_UI.md).

---

## 3. Multi-negocio y multi-sucursal

- Un **negocio** = un tenant (razón social / marca).  
- Cada negocio tiene **N sucursales** (mapa, dirección, horarios).  
- Personal, servicios y citas pertenecen a un negocio (y citas a una sucursal).  
- Datos **aislados** entre negocios.

---

## 4. Catálogo de servicios (visión)

Categorías orientativas (hombre / mujer / unisex). El contenido fino se llena en implementación/investigación:

| Categoría | Ejemplos |
|-----------|----------|
| Cabello | Corte dama/caballero, peinado, brushing, tratamientos |
| Color | Tinte, mechas, balayage, decoloración, matiz |
| Barba / grooming | Arreglo de barba, afeitado, perfiles |
| Uñas | Manicure, pedicure, gel, acrílico, diseños |
| Maquillaje | Social, evento, novia |
| Spa / cuidado | Faciales, cejas, pestañas, masajes ligeros (según negocio) |

Cada servicio puede tener: nombre, descripción, duración, precio, imágenes, sucursales donde aplica, profesionales que lo ofrecen.

Catálogo de **estilos** (cortes, diseños de uñas, etc.) como galería asociada.

---

## 5. Flujo de cita (cliente)

```text
Sucursal (mapa) → Servicio → Profesional disponible → Fecha → Hora libre
    → Datos mínimos (si no hay sesión) → Prepago opcional → Confirmación
```

### Reglas clave

1. No se agenda “con quien caiga”: el cliente **elige profesional**.  
2. Solo slots donde ese profesional está libre y laborable.  
3. La agenda se controla a nivel **negocio** y **empleado**.  
4. Registro/cita sin fricción: **nombre + (email O celular)**.  
5. Más datos solo al **pagar**.

---

## 6. Prepago

| Pago | Efecto |
|------|--------|
| Prepago en línea | Descuento configurable; mayor compromiso de asistencia |
| Pago en local | Precio “lleno” (sin descuento de prepago) |

- Reembolso: **sí**, en escenarios acordados (detalle % / plazos pendiente).  
- Prepago genera **candados** operativos (ver reasignación).

---

## 7. Cancelaciones y reasignación

### Quién puede cancelar

- Cliente (sus citas).  
- Empleado / Admin (con impacto y reglas).  

### Empleado no puede trabajar (enfermedad, accidente, permiso)

1. Validar citas del día — especialmente **prepagadas**.  
2. Admin puede **reasignar** a otro profesional.  
3. Cliente notificado elige:

| Opción | Resultado |
|--------|-----------|
| Aceptar nuevo profesional | Cita se mantiene, cambia staff |
| Reagendar | Nueva fecha/hora (y profesional) |
| Cancelar | Fin de cita; **reembolso** si hubo prepago |

### Candado de permisos

Solicitar día libre / no asistir no es “libre” si hay citas prepagadas sin resolución (reasignación o cancelación gestionada).

---

## 8. Operación del personal

| Capacidad | Descripción |
|-----------|-------------|
| Agenda personal | Ver citas de hoy / mañana (preparar material) |
| Checador | Entrada / salida |
| Comisiones | Según modelo (investigación en [COMMISSIONS_RESEARCH.md](./COMMISSIONS_RESEARCH.md)) |
| Métricas | Clientes atendidos, $ generados, comisión |

Admin/dueño ve la agenda de **todos** los empleados.

---

## 9. Contacto y canales

- Formulario de contacto (email).  
- Enlaces Facebook / WhatsApp / redes.  
- Email transaccional: **Resend** + cola.  
- Opcional: **Telegram bot** para agendar o notificar.  
- Turnstile en formularios públicos.

---

## 10. Reportes (visión admin)

- Ocupación por sucursal / empleado / día.  
- Citas creadas, completadas, canceladas, no-show.  
- Prepagos vs pago local.  
- Comisiones por empleado.  
- Asistencia del personal.

---

## 11. Fuera de alcance (por ahora)

- App nativa móvil (puede ser PWA después).  
- Marketplace de profesionales independientes ajenos al tenant.  
- Inventario completo de productos de retail (salvo que se abra fase).  

---

## 12. Criterios de UX

- Moderno, fresco, juvenil, **unisex**.  
- Poco texto denso; CTAs claros.  
- Flujo de cita en pocos pasos.  
- Admin usable en desktop primero (sidebar).
