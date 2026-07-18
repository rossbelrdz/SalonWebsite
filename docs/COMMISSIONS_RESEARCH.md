# Investigación: comisiones en salones y barberías

**Estado:** placeholder estructurado.  
**Objetivo (Fase 8):** documentar cómo comisionan los sistemas líderes del sector y proponer un modelo para este producto.

No bloquear Fases 0–5.

---

## 1. Preguntas a responder

1. ¿Salario fijo + comisión, solo comisión, o renta de sillón (booth rental)?  
2. ¿% sobre servicio, sobre producto, o ambos?  
3. ¿La comisión se calcula sobre precio lleno o sobre precio con descuento/prepago?  
4. ¿El prepago afecta la comisión del empleado?  
5. ¿Cómo manejan propinas (tips)?  
6. ¿Reportes estándar que espera un dueño?

---

## 2. Sistemas a revisar (Top del sector — lista de trabajo)

Investigar al implementar F8 (nombres orientativos del mercado):

- Fresha  
- Booker / Mindbody  
- Vagaro  
- Square Appointments  
- Zenoti  
- Salonist / GlossGenius / Boulevard  
- Sistemas locales LATAM relevantes  

Por cada uno anotar: modelo de comisión, flexibilidad, reportes, limitaciones.

---

## 3. Modelos candidatos (borrador)

| Modelo | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| A | % fijo por servicio | Simple | Poco flexible |
| B | % por categoría / por empleado | Flexible | Más config |
| C | Fijo + % | Estable para el staff | Más contabilidad |
| D | Booth rental | Independencia del staff | Menos control de marca |

Recomendación de producto: **posponer decisión** hasta investigación; default técnico probable **B o C**.

---

## 4. Datos que el sistema debe poder registrar

- Empleado, servicio, precio cobrado, descuento, prepago sí/no.  
- % o monto de comisión aplicable.  
- Periodo de liquidación (semana/quincena/mes).  
- Ajustes manuales del admin.

---

## 5. Entregable final de esta investigación

- [ ] Tabla comparativa Top 10–15  
- [ ] Modelo recomendado para Salon  
- [ ] Campos de DB y pantallas de reporte  
- [ ] Actualización de PRODUCT.md y PHASES (F8)
