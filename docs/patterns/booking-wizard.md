# Wizard de cita

## Problema

Guiar al cliente de “quiero un servicio” a “cita confirmada” con mínima fricción.

## Cuándo usarlo

- Flujo público **Agendar**.  
- Entrada desde home, servicio, sucursal o “reagendar”.

## Cuándo no

- Admin creando cita manual (puede ser form de una sola página o wizard corto).  
- Solo consulta de precios (catálogo).

## Anatomía (pasos)

1. **Sucursal**  
2. **Servicio**  
3. **Profesional** (o “cualquiera disponible”)  
4. **Fecha y hora** (calendario + slots)  
5. **Datos / prepago** (nombre + email **o** celular; toggle prepago)  
6. **Confirmación**

Stepper visible; poder volver al paso anterior sin perder selección.

## Variantes

| Variante | Notas |
|----------|--------|
| Completo | 1→6 |
| Deep-link servicio | Arranca en paso 2/3 con servicio precargado |
| Reagendar | Parte de cita existente; pasos acotados |
| Logueado | Paso 5 prellena datos del cliente |

## Comportamiento

- Validar paso antes de avanzar.  
- Turnstile en envío final (público).  
- No enviar correo síncrono: cola BullMQ (prod).  
- Prepago: descuento visible vs pago en local.

## Accesibilidad

- Pasos como lista ordenada / `aria-current`.  
- Slots como botones con estado selected.  
- Errores asociados a campos.

## Referencias de mockup

P-06 … P-11 (`mockup/publico/agendar.html`, `confirmacion.html`).

## Implementación

`components/booking/BookingWizard.tsx` + steps.
