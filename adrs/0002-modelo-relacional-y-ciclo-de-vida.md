# ADR 0002: Modelo relacional normalizado y ciclo de vida separado

## Estado

Aceptado

## Contexto

El PRD requiere persistencia relacional para usuarios con roles distintos, perfiles, especialidades, solicitudes con hasta tres imágenes, múltiples cotizaciones, un servicio creado al aceptar una cotización y una única reseña posterior a la finalización. También exige que el backend impida seleccionar más de una cotización y controle las transiciones de estado. No se proporcionó `Design.md`, por lo que el modelo se deriva exclusivamente del PRD.

El listado de estados del PRD incluye `Publicado`, aunque el servicio todavía no existe durante esa etapa. Mantener el mismo estado simultáneamente en solicitud y servicio introduciría dos fuentes de verdad.

## Decisión

Se usará un modelo relacional normalizado con las siguientes entidades lógicas:

- `users`, vinculado por un identificador único al proveedor de autenticación y con un rol exclusivo `CLIENT` o `TECHNICIAN`.
- `client_profiles` y `technician_profiles`, cada uno en relación uno a uno con el usuario de su rol.
- `categories`, `districts` y `technician_specialties`, esta última como relación muchos a muchos entre técnicos y categorías.
- `requests`, perteneciente a un cliente, una categoría y un distrito, con los datos de publicación y estado `DRAFT`, `PUBLISHED`, `ASSIGNED` o `CANCELLED`.
- `request_images`, perteneciente a una solicitud y con referencia al objeto almacenado externamente; el límite de tres imágenes se validará al escribir.
- `quotes`, perteneciente a una solicitud y un técnico, con precio, descripción, disponibilidad y estado de la propuesta; existirá como máximo una por pareja solicitud-técnico y podrá editarse o retirarse mientras la solicitud siga publicada.
- `services`, creado dentro de la misma transacción que acepta una cotización, en relación uno a uno con la solicitud y vinculado a la cotización seleccionada. Su estado será `SCHEDULED`, `IN_PROGRESS`, `AWAITING_CONFIRMATION`, `COMPLETED` o `CANCELLED`.
- `reviews`, en relación uno a uno con el servicio y vinculada al cliente y técnico participantes.

La aceptación de una cotización actualizará la solicitud a `ASSIGNED`, marcará la cotización elegida y creará el servicio en una única transacción. La base de datos impondrá, como mínimo, unicidad para la pareja solicitud-técnico en cotizaciones, el servicio por solicitud, la cotización seleccionada y la reseña por servicio, además de integridad referencial. La calificación promedio del técnico será una proyección derivada de sus reseñas y no una segunda fuente persistida de verdad.

La API combinará el estado de la solicitud y el estado del servicio para presentar la línea de progreso completa exigida por la interfaz.

## Alternativas consideradas

- **Orden de trabajo unificada desde la publicación** — simplifica las consultas del ciclo completo al usar una sola entidad y estado, pero no se eligió porque mezcla la fase de publicación y cotización con la ejecución, y contradice el criterio del PRD según el cual el servicio se crea al aceptar una propuesta.
- **Modelo normalizado con historial de eventos append-only** — proporciona auditoría completa de cada transición y permite reconstruir el estado, pero no se eligió porque añade proyecciones, consistencia y pruebas operativas desproporcionadas para el alcance del MVP.

## Consecuencias

- Las relaciones y restricciones de la base de datos respaldan las reglas de unicidad e integridad del PRD, y la selección atómica reduce el riesgo de asignaciones dobles.
- Solicitud y servicio no compiten como fuentes del mismo estado, y el servicio solo existe cuando hay una propuesta aceptada.
- Las consultas que muestran el ciclo completo deben combinar solicitud y servicio y traducir sus estados a las etiquetas visibles del producto.
- El límite de tres imágenes depende de una escritura controlada por la API o de una restricción avanzada, porque una restricción simple por fila no puede contar registros relacionados.
- Calcular la calificación promedio evita datos obsoletos, pero agrega una agregación a las consultas de perfil o requiere una vista/materialización si el volumen futuro lo justifica.
