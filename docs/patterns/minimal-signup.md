# Registro mínimo cliente

## Problema

Alta de cliente sin fricción: solo lo esencial para la cita.

## Campos

| Campo | Obligatorio |
|-------|-------------|
| Nombre | Sí |
| Correo **o** celular | Sí (al menos uno) |
| Contraseña / OTP | Según modelo auth F4 |

**No** pedir en registro: dirección, cumpleaños, RFC, etc.  
Datos extra en checkout / prepago si hacen falta.

## Comportamiento

- Turnstile en submit.  
- Mismo criterio en wizard paso “Datos”.

## Referencias

P-13 — `mockup/publico/login.html`.  
[PRODUCT.md](../PRODUCT.md).
