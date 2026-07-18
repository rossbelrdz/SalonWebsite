# Formulario de config con secretos

## Problema

Guardar API keys (Resend, Telegram, Turnstile secret, etc.) sin filtrarlas en UI/logs.

## Anatomía

- Label + input tipo password / secret  
- Valor enmascarado si ya existe (`••••••` + “Reemplazar”)  
- Hint de ayuda  
- Nunca re-mostrar el secreto completo tras guardar  

Clase mockup: `.form-control-secret`.

## Comportamiento

- Campo vacío al editar = “no cambiar”.  
- Auditoría: quién cambió, no el valor nuevo en claro.  
- Cifrado en reposo con `APP_ENCRYPTION_KEY` (ver SECURITY).

## Dónde

Config → Correo, Telegram, Turnstile (no Apariencia ni General).

## Referencias

A-14…A-16 — `mockup/admin/config.html`.  
[CONFIGURATION.md](../CONFIGURATION.md), [SECURITY.md](../SECURITY.md).
