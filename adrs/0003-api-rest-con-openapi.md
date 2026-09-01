# ADR 0003: API REST con contrato OpenAPI

## Estado

Aceptado

## Contexto

La aplicación web y la API son desplegables independientes. El PRD requiere operaciones sobre perfiles, solicitudes, imágenes, cotizaciones, servicios y reseñas; listas paginadas y filtradas; autorización por rol y propiedad; y mensajes de error comprensibles. El contrato debe permitir que ambos componentes evolucionen coordinadamente dentro del monorepo sin depender del lenguaje que finalmente se elija para la API.

## Decisión

La aplicación web consumirá una API REST sobre HTTPS, con cuerpos JSON y un contrato OpenAPI versionado como fuente de verdad. La API expondrá recursos para las entidades del dominio y operaciones explícitas para comandos que cambian el ciclo de vida, como seleccionar una cotización, avanzar un servicio y confirmar su finalización.

El contrato definirá como mínimo:

- Rutas bajo una versión mayor de API para permitir evolución incompatible controlada.
- Esquemas de solicitud y respuesta, validaciones, enumeraciones, autenticación y requisitos de autorización.
- Respuestas paginadas para las listas de solicitudes, cotizaciones y servicios, con orden estable y filtros documentados.
- Un formato uniforme de error con código de máquina, mensaje seguro para el usuario, estado HTTP y errores por campo cuando corresponda.
- Autenticación mediante token de acceso enviado por la aplicación web; la API verificará el token y resolverá rol y propiedad antes de ejecutar cada operación protegida.
- Generación o validación automática de tipos del cliente web a partir de OpenAPI dentro del monorepo.

La especificación publicada por la API y la versión consumida por la web se verificarán en integración continua para detectar cambios incompatibles.

## Alternativas consideradas

- **GraphQL con esquema tipado** — permite componer en una petición los datos de solicitudes, técnicos y cotizaciones y evita solicitar campos innecesarios, pero no se eligió por la complejidad adicional de autorización por campo, paginación, caché y control de consultas para este MVP.
- **RPC tipado de extremo a extremo** — ofrece inferencia de tipos y desarrollo rápido cuando todo el sistema usa TypeScript, pero no se eligió porque acopla cliente y servidor, condiciona prematuramente el stack de la API y reduce la independencia del contrato.

## Consecuencias

- OpenAPI proporciona un contrato inspeccionable, comprobable y compatible tanto con FastAPI como con NestJS, además de habilitar tipos generados para la web.
- El versionado y la comprobación contractual reducen regresiones entre desplegables, pero añaden generación de artefactos y controles de compatibilidad al flujo de desarrollo.
- Algunos casos de uso requerirán varias solicitudes HTTP o endpoints de comando específicos, y el equipo deberá evitar rutas REST que expongan cambios de estado sin validar las reglas del dominio.
- La API seguirá siendo responsable de autorización y validación aunque la web use los mismos esquemas para mejorar la experiencia del formulario.
