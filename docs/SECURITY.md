# Seguridad

La seguridad es **requisito de diseño**, no un parche final.  
Aplica a dependencias, datos, secretos, multi-tenant y formularios públicos.

---

## 1. Principios

1. **Least privilege** — permisos según [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md).  
2. **Defense in depth** — validación servidor + Turnstile + rate limit + colas.  
3. **Secrets out of git** — nunca tokens en el repositorio.  
4. **Tenant isolation** — toda query de negocio filtrada por `tenant_id` / `business_id`.  
5. **Dependencias sanas** — sin CVEs conocidos críticos/altos sin mitigación.  
6. **Versiones estables** — Postgres 18.x patch actual, Redis 8, Node LTS; ver [STACK.md](./STACK.md).

---

## 2. Revisión de librerías (CVE / supply chain)

### Obligatorio al añadir o actualizar una dependencia

| Paso | Acción |
|------|--------|
| 1 | Preferir paquetes mantenidos, con releases recientes y adopción real |
| 2 | `npm audit` / `pnpm audit` (o equivalente) en CI y local |
| 3 | Revisar advisory de GitHub / OSV / NVD si el audit marca algo |
| 4 | No instalar paquetes abandonados o con typosquatting obvio |
| 5 | Pin de versiones en lockfile |
| 6 | Evitar `postinstall` scripts opacos cuando sea posible |

### Imágenes Docker

- Usar imágenes **oficiales** o de fuentes confiables.  
- Pin a **tag patch** o **digest**.  
- Reconstruir periódicamente para absorber CVEs del SO base.  
- No ejecutar contenedores como root si se puede evitar (usuario non-root en app).

### PostgreSQL

- Línea **18.x estable**, siempre en el **último patch** disponible (ej. 18.4+).  
- No exponer el puerto 5432 a Internet en producción; solo red Docker interna (+ tunnel si aplica).  
- Credenciales fuertes; sin usuario `postgres` desde la app si se puede rol acotado.  
- Backups cifrados en reposo cuando haya datos reales.

### Redis

- Redis **8** solo en red interna.  
- Password / ACL en entornos no locales.  
- No usar Redis como almacén de secretos de largo plazo.

---

## 3. Secretos y tokens de integración

Configurables desde admin (ver [CONFIGURATION.md](./CONFIGURATION.md)):

| Secreto | Uso |
|---------|-----|
| Resend API key | Correo |
| Telegram bot token | Bot de citas/notificaciones |
| Turnstile site key | Público (sí puede ir al cliente) |
| Turnstile secret key | Solo servidor |
| Cloudflare Tunnel token | Deploy / cloudflared (`CLOUDFLARE_TUNNEL_TOKEN`; [DEPLOY.md](./DEPLOY.md)) |
| DB / Redis passwords | Infra |
| Encryption key (app) | Cifrado de tokens en DB (si se elige ese modelo) |

### Reglas

- **Secret keys nunca en el frontend.**  
- En UI de configuración: mostrar tokens enmascarados; reescribir al guardar.  
- Preferir cifrado en reposo (envelope encryption) para tokens guardados en PostgreSQL.  
- Rotación documentada (quién y cómo).  
- `.env` y `*.pem` en `.gitignore`.

---

## 4. Superficie pública

| Control | Dónde |
|---------|--------|
| Cloudflare Turnstile | Login, registro, contacto, agendar, cancelar (públicos) |
| Rate limiting | API de citas, auth, contacto |
| Validación de input | Zod/similar en servidor |
| CORS / CSRF | Según modelo de sesión elegido en F4 |
| Headers | Helmet o headers Next (CSP progresiva) |

---

## 5. Multi-tenant

- Prohibido confiar solo en el `tenant_id` del cliente (body/query).  
- El tenant sale de la **sesión / membership** del usuario.  
- Tests de regresión: usuario A no lee datos de negocio B.  
- Super Admin es el único rol cross-tenant.

---

## 6. Datos de clientes (privacidad)

- Registro mínimo: **nombre + email O celular**.  
- No pedir datos de pago/fiscales hasta el momento del pago.  
- Logs sin PII completa cuando sea posible.  
- Derecho a baja de cuenta (admin/cliente) contemplado en producto.

---

## 7. Colas y anti-spam (correo)

- Envío **solo** vía BullMQ + worker.  
- Reintentos con backoff; dead-letter para fallos.  
- No reenviar confirmaciones en bucle.  
- Respetar unsub / preferencias cuando existan.  
- Dominio y SPF/DKIM/DMARC en Resend (operación).

---

## 8. Checklist pre-release (seguridad)

- [ ] `npm audit` sin críticos/altos sin justificación  
- [ ] Imágenes Docker actualizadas  
- [ ] Secrets no en repo ni en logs  
- [ ] Turnstile activo en formularios públicos  
- [ ] Permisos validados en tests o checklist manual  
- [ ] Postgres/Redis no expuestos públicamente  
- [ ] CHANGELOG anota fixes de seguridad (`security:`)

---

## 9. Incidentes (mínimo)

1. Rotar secretos comprometidos.  
2. Evaluar alcance multi-tenant.  
3. Parche + release PATCH o MINOR según severidad.  
4. Anotar en CHANGELOG.
