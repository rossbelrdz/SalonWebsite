# Cuenta, PWA, push y seguridad

## Estado (v0.7.1)

| Capacidad | Estado |
|-----------|--------|
| PWA (manifest + SW) | ✅ |
| VAPID / Web Push | ✅ (claves en env) |
| Campanita in-app | ✅ (público + admin) |
| Preferencias de notificación | ✅ en `/cuenta` |
| Editar nombre / email / celular / password | ✅ |
| Correo al crear cuenta | ✅ encolado; envío real si Resend OK |
| MFA (TOTP) | ✅ opcional |
| Passkeys (WebAuthn) | ✅ opcional |

## VAPID

Generadas para este deploy:

```bash
npx web-push generate-vapid-keys --json
```

Variables:

| Env | Uso |
|-----|-----|
| `VAPID_PUBLIC_KEY` | Servidor |
| `VAPID_PRIVATE_KEY` | Servidor (secreto) |
| `VAPID_SUBJECT` | `mailto:…` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Cliente (misma public key) |

## Flujo push

1. Usuario en `/cuenta` → **Activar push en este dispositivo**.  
2. SW recibe `push` y muestra notificación nativa.  
3. Eventos de producto encolan canal `PUSH` si `notifyPush=true`.

## MFA

- Setup en `/cuenta` → QR + código.  
- Login: password → si MFA activo → código de 6 dígitos.

## Passkeys

- Registro en `/cuenta`.  
- Login: **Entrar con Passkey** (opcionalmente con email prellenado).

## Correo de alta

`notifyAccountCreated` al registrarse:

- Crea job EMAIL + IN_APP.  
- Sin API Resend del tenant → status `SKIPPED` (no rompe el registro).  
- Con Resend configurado → correo “Bienvenido a Salon”.
