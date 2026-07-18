# Pagos y prepago (Fase 6)

## Proveedores

| Proveedor | Integración | Endpoints clave |
|-----------|-------------|-----------------|
| **Mercado Pago** | Checkout Pro (redirect) | `POST https://api.mercadopago.com/checkout/preferences` · reembolso `POST /v1/payments/{id}/refunds` |
| **PayPal** | Orders API v2 | `POST /v2/checkout/orders` · capture · refund capture |
| **Clip.mx** | Checkout redireccionado v2 | `POST https://api.payclip.com/v2/checkout` · reembolsos API Clip |
| **NONE** | Demo | Aprueba prepago sin cobro real (si `allowDemoPayments`) |

**Sí: Clip tiene API** para e-commerce (Checkout redireccionado + reembolsos). También tiene PinPad/SDK terminal (presencial), fuera de alcance del prepago web.

## Quién configura qué

| Nivel | Quién | Qué |
|-------|--------|-----|
| **Plataforma** | Super Admin → **Admin → Plataforma** | Pasarela **activa** (MP / PayPal / Clip / Demo) |
| **Tenant** | Admin → **Configuración → Pagos** | Credenciales cifradas del proveedor |
| **Tenant** | Admin → **Citas / prepago** | % descuento + política de reembolso (horas / %) |

## Flujo prepago

1. Cliente marca prepago en el wizard → precio con descuento.  
2. Se crea cita + `Payment` PENDING.  
3. Si hay credenciales del proveedor activo → redirect al checkout.  
4. Webhook / return URL → `Payment` APPROVED, cita `PREPAID`.  
5. Sin pasarela o sin keys (y demo ON) → APPROVED inmediato (modo demo).

## Reembolsos

Política por tenant (`refundFullHours`, `refundPartialPct`, `refundNoneHours`):

- ≥ `refundFullHours` antes de la cita → 100%.  
- Entre `refundNoneHours` y `refundFullHours` → % parcial.  
- &lt; `refundNoneHours` → $0.

Al cancelar una cita `PREPAID` se intenta reembolso en la pasarela.

## Reasignación (3 opciones del cliente)

1. Admin: **Reasignar** en Citas → propone profesional → estado `REASSIGNMENT_PENDING`.  
2. Cliente en **Mis citas → Elegir opción** (`/reasignacion`):  
   - **A** Aceptar nuevo profesional  
   - **B** Reagendar (fecha/hora/profesional)  
   - **C** Cancelar + reembolso según política  

## Candado de ausencias

`POST /api/absences`: si el empleado tiene citas **prepagadas** en el rango, la solicitud queda `BLOCKED` hasta reasignar/resolver. Admin puede `recheck` / `approve` solo si ya no hay prepagadas pendientes.

## Webhooks

| Proveedor | Ruta |
|-----------|------|
| Mercado Pago | `/api/payments/webhooks/mercadopago` |
| PayPal | `/api/payments/webhooks/paypal` |
| Clip | `/api/payments/webhooks/clip` |

`PUBLIC_APP_URL` (o `NEXT_PUBLIC_APP_URL`) debe ser la URL pública (`https://salon.freonx.org`) para back_urls y notification_url.

## Credenciales (no commitear)

| Campo | Dónde |
|-------|--------|
| MP Access Token | Tenant settings (cifrado) |
| MP Public Key | Tenant settings |
| PayPal Client ID / Secret | Tenant settings (secret cifrado) |
| Clip API Key / Secret | Tenant settings (cifrados) → Basic auth |

Documentación oficial:

- [Mercado Pago Checkout Pro](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/overview)  
- [PayPal Orders API](https://developer.paypal.com/docs/api/orders/v2/)  
- [Clip Checkout](https://developer.clip.mx/docs/api-de-checkout)  
