# ADR 0013: Finalización con confirmación explícita del cliente

## Estado

Aceptado

## Contexto

El PRD indica que el técnico actualiza el progreso y finaliza el trabajo, pero también establece que solo el cliente propietario puede confirmar la finalización y que la reseña se habilita después. La lista original salta directamente de `En proceso` a `Finalizado`, por lo que no permite distinguir la declaración del técnico de la aceptación del cliente.

## Decisión

El ciclo de vida del servicio incorporará el estado `AWAITING_CONFIRMATION` entre `IN_PROGRESS` y `COMPLETED`:

1. El técnico seleccionado puede pasar el servicio de `SCHEDULED` a `IN_PROGRESS`.
2. El técnico seleccionado puede declarar que terminó el trabajo mediante la transición de `IN_PROGRESS` a `AWAITING_CONFIRMATION`.
3. Solo el cliente propietario puede confirmar la finalización mediante la transición de `AWAITING_CONFIRMATION` a `COMPLETED`.
4. Solo después de `COMPLETED` se permite crear la única reseña del servicio.

La interfaz mostrará una etiqueta comprensible, como “Pendiente de confirmación del cliente”, y la línea de progreso distinguirá trabajo reportado como terminado de servicio confirmado. La transición será un comando explícito de la API, no una edición libre del campo de estado.

## Alternativas consideradas

- **El cliente finaliza directamente desde `IN_PROGRESS`** — mantiene exactamente la lista original y reduce un estado, pero no se eligió porque la plataforma no podría registrar que el técnico declaró terminado el trabajo antes de pedir confirmación.
- **El técnico marca `COMPLETED` y la confirmación se guarda en `confirmedAt`** — conserva los estados originales y representa ambos actos, pero no se eligió porque `COMPLETED` tendría dos significados y la autorización de reseñas dependería de combinar estado y campo adicional.

## Consecuencias

- La máquina de estados representa sin ambigüedad las acciones distintas del técnico y del cliente y permite habilitar reseñas con una sola condición final.
- Se agrega un estado no enumerado originalmente en el PRD, por lo que contratos, etiquetas, pruebas y prototipos deben incorporarlo.
- Si el cliente no confirma, el servicio puede permanecer en `AWAITING_CONFIRMATION`; el MVP no tendrá cierre automático ni gestión de reclamos porque ambos están fuera del alcance y requieren una decisión futura.
