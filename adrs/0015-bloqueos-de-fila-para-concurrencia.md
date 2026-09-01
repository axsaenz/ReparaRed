# ADR 0015: Bloqueos de fila para selección y transiciones concurrentes

## Estado

Aceptado

## Contexto

Una solicitud puede recibir varias cotizaciones, pero solo una puede seleccionarse y debe dejar de aceptar nuevas propuestas en ese momento. También pueden competir acciones de avance, confirmación y cancelación sobre el mismo servicio. Una validación realizada antes de escribir permite carreras entre peticiones y no garantiza estas reglas.

## Decisión

La API controlará estas carreras mediante transacciones PostgreSQL cortas con bloqueo pesimista de la fila que representa el agregado modificado y revalidación dentro de la transacción.

- Para crear una cotización, la transacción bloqueará la solicitud, comprobará que sigue `PUBLISHED` y que el técnico conserva la especialidad requerida, y luego insertará la propuesta.
- Para seleccionar una cotización, la transacción bloqueará la solicitud, comprobará propiedad y estado, validará que la cotización pertenece a esa solicitud y que su disponibilidad sigue en el futuro, marcará la elegida, cerrará las competidoras, actualizará la solicitud y creará el servicio.
- Para avanzar, confirmar o cancelar un servicio, la transacción bloqueará el servicio y comprobará actor y transición permitida antes de actualizarlo.
- Para crear una reseña, la transacción comprobará el servicio finalizado y se apoyará en la restricción única por servicio.

Las operaciones adquirirán bloqueos en un orden documentado y consistente. No realizarán llamadas de red ni procesamiento de archivos dentro de la transacción. Cuando Prisma no exponga el bloqueo requerido, se usará SQL parametrizado dentro de su transacción interactiva. Las restricciones únicas y claves foráneas permanecerán como defensa final.

Una petición que encuentre el recurso ya modificado devolverá un conflicto de dominio y el estado actual suficiente para que la web invalide su caché y vuelva a representar el flujo.

## Alternativas consideradas

- **Concurrencia optimista con versión e `If-Match`** — evita esperas por bloqueos y hace explícita la versión leída por el cliente, pero no se eligió porque obliga a propagar y manejar versiones en todas las mutaciones de un MVP con baja contención esperada.
- **Aislamiento serializable con reintentos** — ofrece una garantía general y deja que PostgreSQL detecte anomalías, pero no se eligió porque introduce abortos y reintentos menos predecibles y un costo mayor que los bloqueos dirigidos a pocos agregados.

## Consecuencias

- La selección y las transiciones quedan serializadas por solicitud o servicio y no dependen de una ventana entre lectura y escritura.
- Cotizar y seleccionar la misma solicitud comparten el bloqueo, por lo que no puede insertarse una propuesta después de cerrarla.
- Las transacciones deben permanecer breves y adquirir bloqueos siempre en el mismo orden para limitar esperas y riesgo de deadlock.
- Parte de la persistencia requerirá SQL específico de PostgreSQL, reduciendo la portabilidad completa de Prisma.
- Bajo contención, algunas peticiones esperarán o recibirán conflicto y la web deberá refrescar los datos autoritativos.
