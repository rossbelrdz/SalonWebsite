# Deploy: Docker + Cloudflare Tunnel

Cómo exponer Salon en producción / demo pública sin abrir puertos en el router.

**Hostname público (acordado):** `https://salon.freonx.org`  
**Token del tunnel:** owner en `.env` o `docs/credentials.md` (ambos gitignored). Ver [§3](#3-parámetros-que-necesitas-pasar--guardar).

---

## 1. Idea general

```text
Internet
   │  HTTPS → salon.freonx.org
   ▼
Cloudflare edge
   │  Tunnel (outbound desde tu máquina/servidor)
   ▼
cloudflared (contenedor Docker)
   │  HTTP interno en la red Docker
   ▼
app:3000 (Next.js)
```

- No se publica el puerto `3000` a Internet.
- Postgres, Redis y MinIO **solo** en red interna Docker.
- El túnel se autentica con un **token** (`CLOUDFLARE_TUNNEL_TOKEN`).

Desarrollo local **no** requiere tunnel: `docker compose up` y abres `http://localhost:3000`.

---

## 2. Qué hay que configurar en Cloudflare (UI Zero Trust)

Una sola vez (o cuando se rote el token). Cuenta Cloudflare del dominio **freonx.org**.

### 2.1 Prerrequisitos

| Requisito | Detalle |
|-----------|---------|
| Dominio en Cloudflare | `freonx.org` con DNS gestionado por Cloudflare |
| Acceso Zero Trust | [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → Networks → Tunnels |
| Plan | Free de Cloudflare basta para un tunnel básico |

### 2.2 Crear el tunnel

1. Zero Trust → **Networks** → **Tunnels** → **Create a tunnel**.
2. Tipo: **Cloudflared**.
3. Nombre sugerido: `salon` (o `salon-prod`).
4. Cloudflare muestra un **token** (string largo). Ese valor es `CLOUDFLARE_TUNNEL_TOKEN`.
5. **No** hace falta pegar el comando de instalación en el host si usamos el servicio Docker (ver §4).

### 2.3 Public Hostname (ruta del tunnel)

En el tunnel → **Public Hostname** → **Add**:

| Campo | Valor |
|-------|--------|
| **Subdomain** | `salon` |
| **Domain** | `freonx.org` |
| **Path** | *(vacío)* |
| **Type** | `HTTP` |
| **URL** | `app:3000` |

> **Importante:** la URL de servicio es la que ve **cloudflared dentro de la red Docker**.  
> Con Compose, el servicio de la app se llama `app` y escucha en `3000` → `http://app:3000`  
> (en la UI a veces se escribe solo `app:3000` y el tipo HTTP completa el esquema).

Resultado: **https://salon.freonx.org** → contenedor `app`.

### 2.4 DNS

Al guardar el Public Hostname, Cloudflare suele crear el CNAME `salon` → `….cfargotunnel.com` automáticamente.  
Si no: DNS → registro CNAME `salon` → hostname del tunnel (proxied ☁️ naranja).

### 2.5 (Opcional) Access policies

Si en algún momento se quiere proteger rutas de admin con Cloudflare Access, se hace en Zero Trust → Access. **No es obligatorio** para el MVP; la app tiene su propia auth.

---

## 3. Parámetros que necesitas pasar / guardar

### 3.1 Secretos e infra (archivo `.env` en el servidor o máquina de deploy)

Copiar desde [`.env.example`](../.env.example). Mínimo para tunnel + URL pública:

| Variable | ¿Secreto? | Valor / ejemplo | Uso |
|----------|-----------|-----------------|-----|
| `CLOUDFLARE_TUNNEL_TOKEN` | **Sí** | Token de Zero Trust (Tunnel) | Arranca `cloudflared` |
| `PUBLIC_APP_URL` | No | `https://salon.freonx.org` | Links absolutos, redirects, emails, cookies |
| `NEXT_PUBLIC_APP_URL` | No | `https://salon.freonx.org` | URL conocida en el cliente (si la app la usa) |
| `APP_PORT` | No | `3000` | Puerto interno del contenedor app |
| `POSTGRES_*` / `REDIS_URL` / `MINIO_*` | Sí (passwords) | Ver `.env.example` | Stack interno |
| `APP_ENCRYPTION_KEY` | **Sí** | String largo aleatorio | Cifrado de tokens en DB |
| `RESEND_API_KEY` | Sí | Cuando haya correo | Emails con links a la URL pública |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Site = pública | Cuando haya formularios | Anti-bot |
| `TELEGRAM_BOT_TOKEN` | Sí | Opcional | Bot |

### 3.2 Qué me debes pasar (owner → agente / deploy)

Para activar o documentar el tunnel en un entorno concreto, basta con:

1. **`CLOUDFLARE_TUNNEL_TOKEN`** — el token completo del tunnel (no el Tunnel ID suelto).
2. Confirmación de hostname: **`salon.freonx.org`** (ya fijado en este doc).
3. Confirmación de que en Zero Trust el Public Hostname apunta a **`http://app:3000`** (o el nombre de servicio real del compose).

**Cómo pasarlo de forma segura:**

- Preferible: `.env` o `docs/credentials.md` (ambos gitignored). Plantilla: `docs/credentials.example.md`.
- Si lo pegas en chat: se usará **solo** para rellenar esos archivos y **no** se commitea.
- En este repo el token del owner ya puede vivir en `docs/credentials.md`; al scaffold de Compose se copia a `.env`.

Formato esperado del token (orientativo): string largo base64-like, a menudo con prefijo o estructura que Cloudflare genera al crear el tunnel. Si el token se filtra, **revócalo y regenera** en Zero Trust → Tunnel → Configure → token/credentials.

### 3.3 Lo que NO va en el token ni en env del tunnel

| Dato | Dónde vive |
|------|------------|
| Hostname `salon.freonx.org` | Zero Trust Public Hostname + `PUBLIC_APP_URL` |
| Destino interno `app:3000` | Zero Trust (Service URL), no en el token |
| Credenciales de DB/Redis | `.env` del compose, no en Cloudflare |

El token **identifica el tunnel**; el enrutamiento hostname → servicio se configura en el dashboard (o API) de Cloudflare.

---

## 4. Servicio Docker `tunnel` (objetivo Compose)

Cuando exista `docker-compose.yml` (Fase 3 / 9), el servicio opcional será similar a:

```yaml
services:
  app:
    # ...
    expose:
      - "3000"
    # En deploy con tunnel: no publicar 3000 al host, o solo en localhost
    # ports: ["3000:3000"]  # solo dev local

  tunnel:
    image: cloudflare/cloudflared:latest  # pinnear tag/digest en prod
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: ${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - app
    profiles:
      - tunnel   # no se levanta en dev a menos que se pida
```

### Comandos previstos

```bash
# Desarrollo local (sin tunnel)
docker compose up

# Deploy / demo pública con tunnel
docker compose --profile tunnel up -d
```

Requisito: `CLOUDFLARE_TUNNEL_TOKEN` no vacío en `.env`. Si falta, el contenedor `tunnel` fallará al arrancar (esperado).

### Perfil `tunnel`

| Entorno | Perfil | Exposición |
|---------|--------|-----------|
| Dev local | (ninguno) | `localhost:APP_PORT` |
| Demo / prod en freonx | `tunnel` | `https://salon.freonx.org` |

---

## 5. Checklist de arranque en `salon.freonx.org`

- [ ] Dominio `freonx.org` en Cloudflare  
- [ ] Tunnel creado; token copiado a `.env` como `CLOUDFLARE_TUNNEL_TOKEN`  
- [ ] Public Hostname: `salon.freonx.org` → `HTTP` → `app:3000`  
- [ ] DNS CNAME `salon` (proxied)  
- [ ] `.env` con `PUBLIC_APP_URL=https://salon.freonx.org` y `NEXT_PUBLIC_APP_URL=https://salon.freonx.org`  
- [ ] Stack Compose arriba (`app`, `postgres`, `redis`, …)  
- [ ] `docker compose --profile tunnel up -d`  
- [ ] Logs de `tunnel`: conexión registrada / sin errores de auth  
- [ ] Navegador: `https://salon.freonx.org` responde la app  
- [ ] (Si aplica) Resend/Turnstile con URLs/dominio correctos  

---

## 6. Seguridad

- Token del tunnel = **secreto de plataforma**. No va a la UI de tenant ni a logs.  
- Rotación: Zero Trust → tunnel → regenerar token → actualizar `.env` → recrear contenedor `tunnel`.  
- No exponer `5432`, `6379`, `9000` al host en producción.  
- Cookies de sesión: `Secure` + dominio acorde a `salon.freonx.org` cuando exista auth (F4).  
- Detalle general: [SECURITY.md](./SECURITY.md).

---

## 7. Relación con otras configs

| Tema | Doc |
|------|-----|
| Variables y UI de integraciones | [CONFIGURATION.md](./CONFIGURATION.md) |
| Contenedores y red | [ARCHITECTURE.md](./ARCHITECTURE.md), [STACK.md](./STACK.md) |
| Fase de hardening/deploy | [PHASES.md](./PHASES.md) Fase 9 |
| Turnstile (anti-bot, no es el tunnel) | [CONFIGURATION.md](./CONFIGURATION.md) §2.3 |

---

## 8. Resumen de una línea

**Para meter Salon en Docker y sacarlo por Cloudflare:** en Zero Trust apunta `salon.freonx.org` → `http://app:3000`, guarda el token del tunnel en `.env` como `CLOUDFLARE_TUNNEL_TOKEN`, fija `PUBLIC_APP_URL=https://salon.freonx.org`, y levanta Compose con el perfil `tunnel`.
