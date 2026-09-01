# Backlog: ReparaRed

| # | Item | Alcance | Depende de | Contexto extra requerido |
|---|---|---|---|---|
| 1 | Inicializar el monorepo | Crear el workspace y los esqueletos de `apps/web`, `apps/api`, `packages/api-client` y configuración compartida. | — | — |
| 2 | Establecer controles de calidad | Configurar lint, formato, comprobación de tipos, pruebas y builds reproducibles en local y CI. | #1 | — |
| 3 | Crear la base operativa de la API | Configurar NestJS con Fastify, variables validadas, errores uniformes, trazas, logs y health checks. | #1, #2 | — |
| 4 | Conectar Prisma y PostgreSQL | Configurar Prisma, conexiones de runtime y migración, y comprobar una migración inicial reproducible. | #1, #2 | — |
| 5 | Persistir identidad y perfiles | Modelar usuarios, roles inmutables, perfiles de cliente, perfiles de técnico y especialidades con sus restricciones. | #4 | — |
| 6 | Implementar catálogos activos | Modelar, sembrar y consultar categorías y distritos activos mediante seeds idempotentes y endpoints de lectura. | #3, #4 | Catálogo oficial UBIGEO de Lima Metropolitana y Callao (pendiente) |
| 7 | Persistir solicitudes e imágenes | Modelar solicitudes, reservas de carga e imágenes con estados, relaciones, límites, índices y metadatos acordados. | #4, #5, #6 | — |
| 8 | Persistir cotizaciones | Modelar cotizaciones, dinero decimal en PEN, disponibilidad, estados y unicidad por solicitud y técnico. | #4, #5, #7 | — |
| 9 | Persistir servicios y reseñas | Modelar servicios y reseñas con relaciones uno a uno, estados, cancelación y restricciones de integridad. | #4, #8 | — |
| 10 | Automatizar el contrato OpenAPI | Publicar convenciones y esquemas compartidos, generar el cliente TypeScript y detectar incompatibilidades en CI. | #2, #3 | — |
| 11 | Preparar entornos y despliegues | Separar desarrollo, preview y producción y configurar Supabase, Vercel, Railway, secretos y migraciones de release. | #2, #3, #4, #10 | — |
| 12 | Registrar usuarios por rol | Implementar alta como cliente o técnico, contraseña válida, correo duplicado seguro y verificación obligatoria. | #3, #5, #10 | — |
| 13 | Mantener una sesión segura | Implementar login, renovación y logout mediante el BFF, cookies seguras, CSRF, validación JWT y rutas privadas por rol. | #10, #12 | — |
| 14 | Completar el perfil del cliente | Permitir consultar y editar nombre, teléfono y distrito activo con validación y autorización de propietario. | #5, #6, #13 | — |
| 15 | Completar el perfil profesional | Permitir consultar y editar nombre profesional, descripción, teléfono y años de experiencia del técnico. | #5, #13 | — |
| 16 | Administrar especialidades | Permitir al técnico elegir una o más categorías activas sin duplicados y determinar cuándo su perfil está completo. | #6, #15 | — |
| 17 | Gestionar borradores por API | Permitir crear, consultar, editar y descartar únicamente borradores propios sin hacerlos visibles a técnicos. | #7, #13, #14 | — |
| 18 | Construir el formulario de solicitud | Crear el formulario mobile-first por pasos, recuperable desde el borrador y con errores por campo. | #10, #17 | — |
| 19 | Reservar y cargar fotografías | Autorizar reservas con cupo, generar rutas aleatorias y cargar directamente al bucket privado con URL temporal. | #7, #13, #17 | — |
| 20 | Confirmar y leer fotografías privadas | Validar formato y tamaño reales, vincular objetos confirmados y emitir URLs de lectura solo tras autorizar al usuario. | #19 | — |
| 21 | Limpiar borradores y cargas abandonadas | Ejecutar un comando periódico, idempotente y observable para eliminar reservas vencidas, objetos huérfanos y borradores abandonados. | #17, #20 | — |
| 22 | Publicar una solicitud | Bloquear el borrador, validar perfil, campos, fecha, catálogos e imágenes y cambiarlo una sola vez a `PUBLISHED`. | #14, #17, #20 | — |
| 23 | Cancelar una solicitud publicada | Permitir al cliente propietario cancelar con motivo válido, cerrar cotizaciones activas y conservar un estado terminal. | #22 | — |
| 24 | Listar mis solicitudes | Mostrar al cliente sus solicitudes paginadas y ordenadas de forma estable, con carga, vacío, error y estado visible. | #10, #22 | — |
| 25 | Consultar el detalle de mi solicitud | Mostrar al propietario datos, fotografías y estado actual de una solicitud sin revelar información no autorizada. | #20, #24 | — |
| 26 | Listar oportunidades elegibles | Mostrar al técnico solo solicitudes publicadas de sus especialidades, con filtro por categoría y paginación estable. | #16, #22 | — |
| 27 | Consultar una oportunidad | Mostrar al técnico elegible el detalle y fotografías temporales de una solicitud sin exponer teléfonos. | #20, #26 | — |
| 28 | Enviar una cotización | Crear una única propuesta válida por técnico y solicitud bajo bloqueo, con precio, descripción y disponibilidad futura. | #8, #16, #27 | — |
| 29 | Gestionar mis cotizaciones | Listar las propuestas del técnico y permitir editar, retirar o reenviar la misma cotización mientras siga habilitada. | #28 | — |
| 30 | Comparar cotizaciones recibidas | Mostrar al cliente propietario monto, descripción, disponibilidad y experiencia mediante proyecciones que omitan el teléfono. | #25, #28 | — |
| 31 | Seleccionar una cotización | En una transacción, seleccionar una propuesta, cerrar las demás, asignar la solicitud y crear exactamente un servicio. | #9, #30 | — |
| 32 | Revelar contacto tras la selección | Incluir teléfonos solo en las proyecciones del cliente y técnico seleccionados, incluso en servicios luego cancelados. | #31 | — |
| 33 | Consultar servicios asignados | Listar y mostrar a las partes autorizadas el servicio, programación, contacto y línea de progreso combinada. | #31, #32 | — |
| 34 | Iniciar un servicio | Permitir solo al técnico seleccionado cambiar de `SCHEDULED` a `IN_PROGRESS` con bloqueo y manejo de conflicto. | #33 | — |
| 35 | Reportar el trabajo terminado | Permitir solo al técnico seleccionado cambiar de `IN_PROGRESS` a `AWAITING_CONFIRMATION`. | #34 | — |
| 36 | Confirmar la finalización | Permitir solo al cliente propietario cambiar de `AWAITING_CONFIRMATION` a `COMPLETED` y habilitar la reseña. | #35 | — |
| 37 | Cancelar un servicio | Aplicar permisos de cancelación por fase, registrar actor, fecha y motivo y evitar reapertura o nuevas transiciones. | #33, #35, #36 | — |
| 38 | Publicar una reseña | Permitir al cliente crear una única reseña inmutable para un servicio completado, incluso ante concurrencia. | #36 | — |
| 39 | Mostrar la reputación del técnico | Calcular promedio y cantidad desde reseñas persistidas y mostrarlos en perfil y comparación sin duplicar el promedio. | #15, #30, #38 | — |

## Cómo usar este backlog

Cada ítem es una spec independiente. Al implementarlo, arrancá un ciclo de Spec-Driven
Development (`sdd-new` o el flujo equivalente de tu harness) usando este ítem como el
"change" — no el proyecto completo. Si la columna "Contexto extra requerido" tiene algo,
compartilo como contexto al generar la spec de ese ítem.

Cada spec debe incluir únicamente los cambios de base de datos, API, web y pruebas necesarios
para completar su alcance. Los requisitos transversales de seguridad, autorización, manejo de
errores, TanStack Query y responsive se aplican dentro de los ítems que los utilicen, no como
grandes tareas separadas.

Para el ítem #6, antes de generar la spec de este ítem, comparte tu documentación de reglas de
negocio de este dominio como contexto, si la tienes. Actualmente el catálogo UBIGEO no está
disponible y queda anotado como contexto pendiente para preparar esa spec.
