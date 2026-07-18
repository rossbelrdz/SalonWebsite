# Slots de horario

## Problema

Elegir fecha y franja disponible sin sobrecargar.

## Anatomía

- Calendario (días con/sin cupo)  
- Lista/grid de **slots** (botones hora)  
- Estado: disponible / seleccionado / no disponible  

## Comportamiento

- Respetar antelación mínima/máxima del tenant.  
- Ocultar o deshabilitar slots pasados y ocupados.  
- Duración del servicio define el bloque.

## Accesibilidad

- Día y hora anunciados (`aria-pressed` en slot seleccionado).

## Referencias

P-09 — `mockup/publico/agendar.html`.
