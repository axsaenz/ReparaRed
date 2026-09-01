# ADR 0014: Cancelación terminal y acotada por fase

## Estado

Aceptado

## Contexto

El PRD incluye el estado `Cancelado`, pero no especifica actores, etapas permitidas ni qué ocurre con la solicitud y las cotizaciones después de cancelar. El MVP excluye gestión de reclamos, garantías, asignación automática y panel administrativo avanzado, por lo que una reapertura compleja no puede asumirse.

## Decisión

La cancelación será terminal y dependerá de la fase:

- El cliente propietario puede cancelar una solicitud mientras está `PUBLISHED`.
- Después de seleccionar una cotización, el cliente propietario o el técnico seleccionado pueden cancelar el servicio desde `SCHEDULED` o `IN_PROGRESS`.
- En `AWAITING_CONFIRMATION`, solo el cliente propietario puede confirmar la finalización o cancelar el servicio.
- `COMPLETED` y `CANCELLED` son estados terminales y no admiten cancelación ni reapertura.

Toda cancelación exigirá un motivo no vacío y registrará actor y fecha. Será un comando explícito de API sujeto a autorización y control de concurrencia. Cancelar un servicio no reabrirá la solicitud, no reactivará cotizaciones rechazadas y no asignará otro técnico. Si el cliente aún necesita el trabajo, deberá publicar una nueva solicitud en el MVP.

## Alternativas consideradas

- **Solo el cliente puede cancelar** — simplifica permisos y evita cambios unilaterales del técnico, pero no se eligió porque un técnico que ya no puede atender carecería de un mecanismo formal para cerrar el servicio antes de reportarlo terminado.
- **Cancelar y reabrir la solicitud** — permite buscar reemplazo sin una nueva publicación, pero no se eligió porque obliga a definir vigencia de cotizaciones, reversión de la selección, historial y reasignación, ampliando el alcance funcional.

## Consecuencias

- Los estados terminales y la ausencia de reapertura mantienen una máquina de estados simple y verificable.
- Actor, fecha y motivo proporcionan trazabilidad básica sin construir un sistema de reclamos.
- Un cliente cuyo técnico cancele debe crear otra solicitud y no puede reutilizar las cotizaciones anteriores.
- Permitir que el técnico cancele durante la ejecución puede perjudicar al cliente, pero resolver reputación, sanciones o disputas queda fuera del alcance del MVP.
