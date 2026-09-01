# ADR 0010: Resiliencia síncrona y acotada

## Estado

Aceptado

## Contexto

ReparaRed depende de la API, PostgreSQL, Supabase Auth y Supabase Storage. Una interrupción o respuesta perdida no debe producir asignaciones dobles, transiciones parciales ni mensajes engañosos. Al mismo tiempo, el MVP excluye pagos, chat y notificaciones push, por lo que introducir colas y procesamiento distribuido no sería proporcional al riesgo actual.

## Decisión

Los flujos del MVP serán síncronos y fallarán de forma acotada y observable:

- Toda llamada de red o adquisición de conexión tendrá un timeout explícito y configurable.
- Las operaciones que modifican varias entidades usarán una transacción PostgreSQL y restricciones de base de datos; ante conflicto de negocio o concurrencia responderán sin aplicar cambios parciales.
- La web podrá reintentar automáticamente, con backoff y jitter limitados, lecturas idempotentes que fallen por causas transitorias. No reintentará automáticamente errores de validación, autorización o ausencia.
- Las mutaciones no se reintentarán de forma ciega. Si su resultado es incierto, la interfaz consultará el recurso autoritativo antes de ofrecer repetir la acción.
- La API clasificará errores de entrada, autenticación, autorización, ausencia, conflicto, límite y dependencia no disponible mediante estados HTTP y el formato uniforme definido en OpenAPI.
- Los mensajes para usuarios no expondrán trazas, SQL, tokens ni detalles internos. Los logs estructurados incluirán un identificador de correlación y contexto técnico seguro.
- La API publicará comprobaciones separadas de vida y disponibilidad. La disponibilidad verificará únicamente dependencias necesarias para aceptar tráfico y tendrá sus propios límites de tiempo.

No se incorporarán colas, outbox ni circuit breakers distribuidos al MVP. Podrán añadirse si aparecen efectos asíncronos o requisitos de disponibilidad que los justifiquen.

## Alternativas consideradas

- **Idempotencia persistida para todos los comandos importantes** — permite repetir mutaciones de manera segura después de una respuesta perdida, pero no se eligió porque exige almacenar claves y resultados, definir expiración y mantener semántica adicional por endpoint para un MVP sin pagos.
- **Colas y outbox transaccional** — permite procesar efectos de forma asíncrona y recuperarse de interrupciones, pero no se eligió porque añade infraestructura, estados pendientes y consistencia eventual a flujos que el usuario espera resolver inmediatamente.

## Consecuencias

- Las transacciones y restricciones protegen la integridad sin introducir infraestructura distribuida adicional.
- Los fallos tendrán respuestas consistentes y evidencia correlacionable entre web, API y plataforma.
- Durante una caída de PostgreSQL o Supabase, los flujos afectados quedarán temporalmente no disponibles en lugar de encolarse para ejecución posterior.
- Las mutaciones con respuesta incierta requieren una lectura de reconciliación y una interfaz que no invite a repetir acciones sensibles sin verificar el estado.
- Si el producto incorpora pagos, notificaciones garantizadas o procesos prolongados, esta decisión deberá revisarse.
