# ADR 0020: Contacto visible solo después de seleccionar una cotización

## Estado

Aceptado

## Contexto

Los perfiles de cliente y técnico contienen teléfono, pero el PRD indica que el pago y los detalles finales se coordinan fuera de la plataforma después de seleccionar la cotización. El MVP no incluye chat ni verificación oficial de identidad. Exponer teléfonos antes de asignar aumenta el tratamiento de datos personales y permite desviar el flujo de comparación.

## Decisión

Los teléfonos se divulgarán mutuamente solo cuando exista un servicio creado por la selección de una cotización:

- El cliente propietario podrá ver el teléfono del técnico seleccionado.
- El técnico seleccionado podrá ver el teléfono del cliente propietario.
- Técnicos no seleccionados, otros clientes y visitantes no recibirán esos teléfonos.
- Antes de la selección, las proyecciones de perfiles y cotizaciones omitirán el campo de teléfono; no se enviará oculto ni enmascarado al navegador.
- Si el servicio se cancela, las partes históricamente participantes conservarán acceso dentro del detalle de ese servicio, sujeto a autenticación, para comprender el registro; el dato no se hará público.

La API aplicará esta política al construir cada respuesta. El BFF y la web no dependerán de ocultar visualmente datos que ya fueron enviados.

## Alternativas consideradas

- **Teléfono del técnico visible al presentar una cotización** — facilita aclaraciones antes de elegir, pero no se eligió porque expone datos personales y permite coordinar fuera de la plataforma antes de completar la selección.
- **Teléfonos de ambas partes visibles antes de seleccionar** — maximiza la coordinación en ausencia de chat, pero no se eligió porque amplía innecesariamente el acceso y debilita el flujo de comparación y asignación del MVP.

## Consecuencias

- La API minimiza datos personales y alinea el acceso a contacto con el momento de asignación definido por el PRD.
- Las partes no pueden aclarar dudas por teléfono antes de seleccionar y el MVP tampoco ofrece chat; las descripciones de solicitud y cotización deben ser suficientes.
- Se requieren DTO o proyecciones distintas para perfiles públicos, propuestas y servicios asignados.
- La autorización debe probar ausencia del campo, no solo su ocultamiento visual.
