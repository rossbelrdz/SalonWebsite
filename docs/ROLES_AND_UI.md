# Roles y UI (admin / app)

Idioma: **español**.  
Permisos: [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md).  
**Shells (obligatorio):** [patterns/app-shells.md](./patterns/app-shells.md).

---

## 0. Modelo de UI — tres shells (no negociable)

El producto **no** tiene un menú único multi-rol. Hay tres áreas con chrome distinto,
alineadas al mockup congelado:

| Shell | Quién | Chrome | Rutas app | Mockup |
|-------|--------|--------|-----------|--------|
| **A Público** | Visitante + Cliente (+ staff solo cuando navega el sitio) | **Top nav** horizontal | `app/(public)/*` | `mockup/publico/*` |
| **B Admin** | Admin negocio + Super Admin | **Sidebar** + topbar | `app/admin/*` | `mockup/admin/*` |
| **C Empleado** | Empleado (+ admin/super entrando a “vista empleado”) | **Sidebar** reducido + topbar | `app/empleado/*` | `mockup/empleado/*` |

### Reglas anti-regresión

1. **No mezclar** el top-nav público con el árbol del sidebar admin en el mismo header/drawer.  
2. **No** usar `PublicNav` dentro de `/admin` ni `/empleado`.  
3. **No** usar `AdminShell` / `EmpleadoShell` dentro de `(public)`.  
4. En móvil, **cada shell** tiene su propio drawer (mismo *patrón* ☰, distinto *contenido*).  
5. “Admin” / “Mi agenda” en el sitio público son **puertas de una línea**, no el menú del panel.  
6. `/cuenta` y `/mis-citas` son **Shell A** (cuenta personal), aunque el usuario sea admin.  
7. Fases nuevas (F8 checador/comisiones/reportes, F9 hardening): **añadir ítems solo al shell que corresponda**.

Detalle + checklist PR: [patterns/app-shells.md](./patterns/app-shells.md).  
Patrones: [public-nav](./patterns/public-nav.md) · [admin-sidebar](./patterns/admin-sidebar.md).

```text
          ┌──────── Shell A — sitio ────────┐
 Visitante│  Top: Inicio · Servicios · …    │
          │  Entrar / Mi cuenta · Agendar   │
          └───────────────┬─────────────────┘
                          │ “Mi cuenta”
          ┌──────── Shell A — cuenta ───────┐
 Cliente  │  Mis citas · Mi cuenta          │
          │  Volver al sitio · Salir        │
          │  (puerta Admin / agenda si staff)│
          └───────────────┬─────────────────┘
                          │ puerta panel
          ┌───────────────▼─────────────────┐
 Admin    │  Shell B — sidebar operación    │
          └───────────────┬─────────────────┘
                          │ puerta empleado
          ┌───────────────▼─────────────────┐
 Empleado │  Shell C — sidebar “Mi día”     │
          └─────────────────────────────────┘
```


---

## 1. Roles

### Super Admin (plataforma)

- Gestiona tenants / settings de plataforma (`/admin/plataforma`).  
- **Bypass total de permisos** en lógica (`can()` / `requirePermission`).  
- UI: **Shell B**; la columna SUPER_ADMIN de la matriz de permisos **no es editable** (siempre todo).  
- No es el día a día de un salón concreto (salvo soporte).  
- Puede no tener `Membership` en el tenant demo: sigue entrando a admin.

### Admin (negocio)

- Dueño o gerente del salón/cadena dentro de un tenant.  
- **Shell B** completo de operación.  
- Configura integraciones (Resend, Telegram, Turnstile, pagos).  
- Ve agendas de todos los empleados; reasigna y reembolsa según permisos.

### Empleado

- **Shell C**: agenda propia; F8: checador, comisiones propias.  
- Puede cancelar/gestionar dentro de reglas y RBAC.  
- No ve tokens ni config de integraciones.

### Cliente

- **Shell A**: sitio + mis citas + cuenta.  
- Registro mínimo; responde a reasignaciones.

---

## 2. Layout administración — Sidebar izquierdo (Shell B)

```text
┌──────────────────┬─────────────────────────────┐
│  LOGO / Negocio  │  Topbar (☰ móvil, notif.)   │
│                  ├─────────────────────────────┤
│  Dashboard       │                             │
│  Citas           │     Contenido de sección    │
│  Servicios       │                             │
│  Sucursales      │                             │
│  Personal        │                             │
│  Clientes        │                             │
│  Asistencia      │                             │
│  Comisiones      │                             │
│  Reportes        │                             │
│  ────────────    │                             │
│  Log notifs      │                             │
│  Matriz permisos │                             │
│  Matriz notifs   │                             │
│  Configuración   │                             │
│  Plataforma*     │                             │
│  ────────────    │                             │
│  Vista empleado  │                             │
│  Mi cuenta       │                             │
│  Sitio público   │                             │
│  Cerrar sesión   │                             │
└──────────────────┴─────────────────────────────┘
```

\* Solo superadmin.

### Visibilidad del menú por rol

| Ítem | Super Admin | Admin | Empleado |
|------|:-----------:|:-----:|:--------:|
| Dashboard plataforma | ✅ | ❌ | ❌ |
| Dashboard negocio | ✅ | ✅ | ❌ |
| Citas (todas) | ✅ | ✅ | ❌ |
| Agenda propia (Shell C) | puerta | puerta | ✅ |
| Servicios / sucursales / personal / clientes | ✅ | ✅ | ❌ |
| Asistencia / comisiones / reportes (F8) | ✅ | ✅ | propias en Shell C |
| Config + matrices | ✅ | ✅ (RBAC) | ❌ |

---

## 3. Layout empleado — Sidebar (Shell C)

Igual esqueleto visual que admin (`admin-shell`), menú del **mockup empleado**:

- Agenda hoy · Checador · Mis comisiones · Solicitar permiso  

- Footer: Vista admin (si aplica) · Mi cuenta · Sitio público · Salir  

**No** reutilizar `PublicNav` aquí.

---

## 4. Áreas de Configuración (detalle, Shell B)

1. **General** — nombre comercial, logo, zona horaria, moneda.  
2. **Apariencia** — color primario y acento del tenant. Ver [patterns/brand-theme.md](./patterns/brand-theme.md).  
3. **Correo (Resend)** — API key, from, pruebas de envío.  
4. **Telegram** — token bot, activar/desactivar, vinculación.  
5. **Turnstile** — site key + secret.  
6. **Usuarios** — alta/baja staff y clientes.  
7. **Citas / prepago** — descuentos y políticas.  
8. **Matrices** (pantallas propias, no solo docs): permisos `/admin/permisos`, notificaciones `/admin/matriz-notificaciones`.

---

## 5. UI pública (cliente) — Shell A

| Pantalla | Contenido |
|----------|-----------|
| Home | Hero, CTAs, highlights |
| Servicios | Grid por categorías |
| Sucursales | Lista + mapa |
| Agendar | Wizard sucursal → servicio → pro → fecha/hora |
| Contacto | Form + WhatsApp/Facebook |
| Mis citas | Próximas / historial / cancelar |
| Cuenta | Datos, notifs, MFA, passkeys (+ tarjetas “accesos de trabajo” si staff) |
| Auth | Registro mínimo / login |

Mockup: [MOCKUP.md](./MOCKUP.md). Nav: [patterns/public-nav.md](./patterns/public-nav.md).

---

## 6. Principios de UI

- **Un shell por área** — ver §0.  
- Sidebar colapsable / drawer en tablet y móvil (admin y empleado).  
- Desktop-first en admin; móvil-first en cliente.  
- Unisex, moderno, juvenil.  
- Estados vacíos y de carga claros.  
- Acciones destructivas con confirmación.  
- Tokens y componentes: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).
