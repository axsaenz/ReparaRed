# ADR 0017: Fechas y horas en UTC con presentación en America/Lima

## Estado

Aceptado

## Contexto

El PRD solicita una fecha preferida para la solicitud, una fecha disponible en la cotización y una fecha programada en el servicio, pero no precisa si incluyen hora ni cómo manejar zonas horarias. Se decidió que el MVP sí permitirá indicar fecha y hora. Como la moneda inicial es PEN y el producto está orientado a distritos del mercado peruano, también debe fijarse una interpretación temporal única.

## Decisión

`preferredAt`, `availableAt` y `scheduledAt` representarán instantes con fecha y hora. PostgreSQL los almacenará como `TIMESTAMPTZ`, normalizados a UTC, y OpenAPI los serializará como cadenas RFC 3339 con zona u offset explícito.

La interfaz capturará y mostrará estos valores en la zona IANA `America/Lima`. La API convertirá a instante y validará que la fecha y hora sean futuras al crear una solicitud o cotización. También volverá a validar `availableAt` al seleccionar, porque una propuesta vigente puede haber quedado en el pasado. La disponibilidad propuesta por el técnico podrá diferir de la preferida por el cliente. Al seleccionar una cotización, su `availableAt` inicializará `scheduledAt` del servicio.

La zona de producto será una configuración explícita y no se derivará silenciosamente de la zona del dispositivo.

## Alternativas consideradas

- **Fecha calendario sin hora** — evita zonas horarias y coincide con la redacción literal de “fecha”, pero no se eligió porque no permite expresar una programación concreta dentro del día.
- **Zona horaria IANA por usuario** — permite operar correctamente en varios países y mostrar cada instante en contexto local, pero no se eligió porque añade un campo de perfil y complejidad de comparación fuera del alcance geográfico inicial.
- **Conservar únicamente el offset del navegador** — requiere menos configuración, pero no se eligió porque un offset no representa una zona estable y la misma operación podría mostrarse de forma distinta según el dispositivo.

## Consecuencias

- API y base de datos comparan instantes inequívocos y la interfaz presenta una hora consistente para el mercado inicial.
- El MVP queda funcionalmente orientado a `America/Lima`; expandirse a otras zonas requerirá revisar perfiles, filtros y presentación.
- Formularios y pruebas deben cubrir conversión entre hora local y UTC y rechazar entradas sin zona en el contrato.
- Cambiar la fecha programada después de seleccionar una cotización no está definido por el PRD y queda fuera del MVP salvo una decisión posterior.
