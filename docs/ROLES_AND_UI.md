# Roles y UI (admin / app)

Idioma: **español**.  
Permisos: [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md).

---

## 1. Roles

### Super Admin (plataforma)

- Gestiona tenants (negocios).  
- Configuración global.  
- Soporte / supervisión.  
- No es el día a día de un salón concreto (salvo soporte).

### Admin (negocio)

- Dueño o gerente del salón/cadena dentro de un tenant.  
- Sidebar completo de operación.  
- Configura integraciones (Resend, Telegram, Turnstile).  
- Ve agendas de todos los empleados.  
- Reasigna citas y gestiona reembolsos.

### Empleado

- Agenda propia, checador, comisiones propias.  
- Puede cancelar/gestionar dentro de reglas.  
- No ve tokens ni config de integraciones.

### Cliente

- Flujo público + “mis citas”.  
- Registro mínimo.  
- Responde a reasignaciones.

---

## 2. Layout administración — Sidebar izquierdo

Estructura objetivo del menú (Admin). Empleado ve un subconjunto.

```text
┌──────────────────┬─────────────────────────────┐
│  LOGO / Negocio  │  Topbar (usuario, notif.)   │
│                  ├─────────────────────────────┤
│  Dashboard       │                             │
│  Citas           │     Contenido de sección    │
│  Calendario      │                             │
│  Servicios       │                             │
│  Catálogo/Estilos│                             │
│  Sucursales      │                             │
│  Personal        │                             │
│  Clientes        │                             │
│  Asistencia      │                             │
│  Comisiones      │                             │
│  Reportes        │                             │
│  ────────────    │                             │
│  Configuración   │                             │
│    · General     │                             │
│    · Apariencia  │  colores primary / accent   │
│    · Correo      │                             │
│    · Telegram    │                             │
│    · Turnstile   │                             │
│    · Usuarios    │                             │
│    · Citas/prepago│                            │
│    · Roles*      │                             │
│  Cerrar sesión   │                             │
└──────────────────┴─────────────────────────────┘
```

\* Roles: edición de matriz solo si se implementan roles custom; al inicio roles fijos.

### Visibilidad del menú por rol

| Ítem | Super Admin | Admin | Empleado |
|------|:-----------:|:-----:|:--------:|
| Dashboard plataforma | ✅ | ❌ | ❌ |
| Dashboard negocio | ⚠️ | ✅ | ⚠️ reducido |
| Citas (todas) | ⚠️ | ✅ | ❌ |
| Mis citas / agenda | — | ✅ | ✅ |
| Servicios / catálogo | ⚠️ | ✅ | ❌ (solo lectura futura?) |
| Sucursales | ⚠️ | ✅ | ❌ |
| Personal | ⚠️ | ✅ | ❌ |
| Clientes | ⚠️ | ✅ | ❌ |
| Asistencia | ⚠️ | ✅ | propio |
| Comisiones | ⚠️ | ✅ | propias |
| Reportes | ⚠️ | ✅ | propios |
| Configuración | ⚠️ | ✅ | ❌ |

---

## 3. Áreas de Configuración (detalle)

1. **General** — nombre comercial, logo, zona horaria, moneda.  
2. **Apariencia** — color primario y acento del tenant (preview + restaurar defaults). Ver [patterns/brand-theme.md](./patterns/brand-theme.md).  
3. **Correo (Resend)** — API key, from, pruebas de envío.  
4. **Telegram** — token bot, activar/desactivar, instrucciones de vinculación.  
5. **Turnstile** — site key + secret.  
6. **Usuarios** — alta/baja staff y clientes.  
7. **Citas / prepago** — descuentos y políticas (cuando F6).

---

## 4. UI pública (cliente)

| Pantalla | Contenido |
|----------|-----------|
| Home | Hero, CTAs, highlights |
| Servicios | Grid por categorías |
| Sucursales | Lista + mapa |
| Agendar | Wizard sucursal → servicio → pro → fecha/hora |
| Contacto | Form + WhatsApp/Facebook |
| Mis citas | Próximas / historial / cancelar |
| Auth | Registro mínimo / login |

Mockup: [MOCKUP.md](./MOCKUP.md).

---

## 5. Principios de UI

- Sidebar colapsable en tablet.  
- Desktop-first en admin; móvil-first en cliente.  
- Unisex, moderno, juvenil.  
- Estados vacíos y de carga claros.  
- Acciones destructivas con confirmación.
