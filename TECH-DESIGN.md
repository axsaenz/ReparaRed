# Technical Design Document: ReparaRed

**Versión:** 1.0  
**Estado:** Aprobado para implementación del MVP  
**Tipo de proyecto:** Greenfield  
**PRD:** [`PRD.md`](PRD.md)  
**Design.md disponible:** No. El modelo de datos y los criterios de interfaz se derivaron únicamente del PRD y de las decisiones confirmadas durante la entrevista.

## 1. Resumen

ReparaRed será una aplicación web responsive que conecta clientes que publican reparaciones domésticas con técnicos que presentan cotizaciones. El MVP cubre registro por rol, perfiles, publicación con fotografías privadas, descubrimiento por especialidad, comparación y selección de una cotización, seguimiento de un servicio, confirmación del cliente y reseña. La solución separa una aplicación Next.js y una API NestJS dentro de un monorepo, usa Supabase para PostgreSQL, identidad y objetos, y mantiene todas las reglas de autorización y negocio en la API.

## 2. Alcance técnico

### Incluido

- Aplicación web mobile-first con rutas públicas y áreas privadas por rol.
- BFF de sesión en Next.js y API REST versionada con OpenAPI.
- Persistencia relacional, migraciones y restricciones de integridad.
- Autenticación por correo con verificación obligatoria.
- Autorización por rol, propiedad, participación y estado del recurso.
- Fotografías privadas mediante carga directa y URLs firmadas.
- Máquinas de estado para solicitud, cotización y servicio.
- Despliegues independientes de web y API.
- Observabilidad mínima, health checks, limpieza de borradores y cargas abandonadas.

### Fuera de alcance

Se mantienen todos los elementos excluidos por el PRD: pagos, mapas, geolocalización en tiempo real, asignación automática, chat, notificaciones push, garantías, reclamos, verificación oficial de identidad, aplicación móvil nativa, recomendaciones con IA, suscripciones y panel administrativo avanzado.

La arquitectura no debe introducir estos elementos de forma implícita. En particular, una cancelación no reabre ni reasigna una solicitud, y un servicio pendiente de confirmación no se cierra automáticamente.

## 3. Arquitectura de componentes

```text
Navegador
  |  HTTPS, mismo origen, cookies Secure/HttpOnly
  v
Next.js Web + BFF (Vercel)
  |  HTTPS, Bearer token, REST/OpenAPI
  v
NestJS API (Railway)
  |-- PostgreSQL (Supabase)
  |-- JWKS / Auth (Supabase Auth)
  `-- URLs firmadas / metadatos (Supabase Storage)

Navegador -- URL firmada temporal --> Supabase Storage
Railway Cron -- comando de mantenimiento --> borradores, reservas y objetos vencidos
```

### 3.1 Aplicación web

Responsabilidades:

- Renderizar landing, autenticación, dashboards, formularios y seguimiento responsive.
- Mantener la sesión en el BFF sin exponer tokens a JavaScript.
- Consumir la API mediante un cliente generado o validado desde OpenAPI.
- Mantener estado remoto con TanStack Query y estado efímero con React.
- Cargar imágenes directamente a Storage usando URLs firmadas recibidas por el BFF.
- Omitir de la interfaz acciones no autorizadas, sin asumir que eso sustituye controles backend.

No accede directamente a tablas de Supabase ni implementa reglas de negocio.

### 3.2 API

Responsabilidades:

- Verificar tokens Supabase y resolver el usuario de dominio.
- Aplicar validación, autorización, máquinas de estado y políticas de privacidad.
- Publicar y validar el contrato OpenAPI.
- Coordinar transacciones, bloqueos de fila y persistencia Prisma/PostgreSQL.
- Emitir URLs firmadas después de autorizar reservas y lecturas.
- Exponer health checks y logs estructurados con correlación.
- Ejecutar el comando de limpieza de datos y objetos temporales.

### 3.3 Supabase

- **Auth:** credenciales, verificación de correo, sesiones, recuperación y emisión de tokens.
- **PostgreSQL:** fuente persistente de verdad para el dominio.
- **Storage:** bucket privado para fotografías; no contiene lógica de autorización del producto.

### 3.4 Organización del monorepo

La distribución lógica prevista es:

```text
apps/
  web/              # Next.js, BFF y UI
  api/              # NestJS, Prisma y comando de mantenimiento
packages/
  api-client/       # Tipos/cliente generados desde OpenAPI
  config/           # Configuración compartida de lint/TypeScript, sin secretos
adrs/
PRD.md
TECH-DESIGN.md
```

No se compartirán entidades Prisma como contrato de frontend. OpenAPI es la frontera entre aplicaciones.

## 4. Decisiones de arquitectura

| # | Decisión | Estado |
|---|---|---|
| [ADR-0001](adrs/0001-componentes-y-monorepo.md) | Componentes separados en un monorepo | Aceptado |
| [ADR-0002](adrs/0002-modelo-relacional-y-ciclo-de-vida.md) | Modelo relacional normalizado y ciclo de vida separado | Aceptado |
| [ADR-0003](adrs/0003-api-rest-con-openapi.md) | API REST con contrato OpenAPI | Aceptado |
| [ADR-0004](adrs/0004-nextjs-para-aplicacion-web.md) | Next.js App Router para la aplicación web | Aceptado |
| [ADR-0005](adrs/0005-nestjs-fastify-para-api.md) | NestJS con Fastify para la API | Aceptado |
| [ADR-0006](adrs/0006-supabase-para-datos-identidad-y-objetos.md) | Supabase para datos, identidad y almacenamiento | Aceptado |
| [ADR-0007](adrs/0007-prisma-para-persistencia.md) | Prisma para persistencia y migraciones | Aceptado |
| [ADR-0008](adrs/0008-despliegue-en-vercel-y-railway.md) | Despliegue en Vercel y Railway | Aceptado |
| [ADR-0009](adrs/0009-estado-remoto-con-tanstack-query.md) | Estado remoto con TanStack Query | Aceptado |
| [ADR-0010](adrs/0010-resiliencia-sincrona-y-acotada.md) | Resiliencia síncrona y acotada | Aceptado |
| [ADR-0011](adrs/0011-nextjs-como-bff-de-sesion.md) | Next.js como BFF de sesión | Aceptado |
| [ADR-0012](adrs/0012-imagenes-privadas-con-urls-firmadas.md) | Imágenes privadas con URLs firmadas | Aceptado |
| [ADR-0013](adrs/0013-finalizacion-con-confirmacion-del-cliente.md) | Finalización con confirmación del cliente | Aceptado |
| [ADR-0014](adrs/0014-cancelacion-terminal-por-fase.md) | Cancelación terminal por fase | Aceptado |
| [ADR-0015](adrs/0015-bloqueos-de-fila-para-concurrencia.md) | Bloqueos de fila para concurrencia | Aceptado |
| [ADR-0016](adrs/0016-precios-decimales-con-moneda-iso.md) | Precios decimales con moneda ISO | Aceptado |
| [ADR-0017](adrs/0017-fechas-horas-en-utc-para-lima.md) | Fechas y horas en UTC para America/Lima | Aceptado |
| [ADR-0018](adrs/0018-catalogo-configurable-de-distritos.md) | Catálogo configurable de distritos | Aceptado |
| [ADR-0019](adrs/0019-borrador-privado-antes-de-publicar.md) | Borrador privado antes de publicar | Aceptado |
| [ADR-0020](adrs/0020-contacto-visible-solo-tras-seleccion.md) | Contacto visible solo tras selección | Aceptado |

## 5. Modelo de datos

Todas las claves primarias de dominio serán identificadores opacos. Los nombres siguientes son lógicos; la migración Prisma fijará nombres físicos, precisión y nulabilidad exactamente.

### 5.1 Entidades

| Entidad | Campos principales | Reglas e índices |
|---|---|---|
| `users` | `id`, `authSubject`, `email`, `role`, `createdAt`, `updatedAt` | `authSubject` único; correo normalizado; rol `CLIENT` o `TECHNICIAN` e inmutable en el MVP; Supabase Auth es la fuente autoritativa del correo |
| `client_profiles` | `userId`, `name`, `phone`, `districtId`, timestamps | Uno a uno con usuario cliente; nombre 2–100; teléfono E.164 de 8–15 dígitos |
| `technician_profiles` | `userId`, `professionalName`, `description`, `phone`, `yearsExperience`, timestamps | Uno a uno con usuario técnico; descripción 20–1000; experiencia entera 0–80 |
| `districts` | `id`, `ubigeoCode`, `name`, `province`, `department`, `isActive` | UBIGEO único; seed idempotente de Lima Metropolitana y Callao |
| `categories` | `id`, `slug`, `name`, `isActive` | Slug único; seed idempotente con Gasfitería y tuberías, Electricidad básica, Reparación de muebles y Limpieza especializada; sin panel administrativo |
| `technician_specialties` | `technicianId`, `categoryId`, `createdAt` | Clave única compuesta; al menos una especialidad para operar como técnico |
| `requests` | `id`, `clientId`, `categoryId`, `districtId`, `title`, `description`, `preferredAt`, `status`, `publishedAt`, cancelación, timestamps | Título 5–120; descripción 20–2000; índices por estado/categoría/publicación y cliente/publicación |
| `upload_reservations` | `id`, `requestId`, `objectKey`, tamaño/tipo declarados, `status`, `expiresAt`, `confirmedAt` | Object key único; solo para borradores propios; expira y se limpia |
| `request_images` | `id`, `requestId`, `objectKey`, `mimeType`, `byteSize`, `position`, timestamps | Object key único; posición única por solicitud; 1–3 al publicar; máximo 5 MiB |
| `quotes` | `id`, `requestId`, `technicianId`, `amount`, `currency`, `description`, `availableAt`, `status`, timestamps | Única por solicitud+técnico; `NUMERIC(8,2)` entre `0.01` y `999999.99`; moneda `PEN`; descripción 10–1000; índice por técnico y creación |
| `services` | `id`, `requestId`, `selectedQuoteId`, `scheduledAt`, `status`, cancelación, timestamps de transición | Solicitud y cotización seleccionada únicas; índices por estado y creación; el técnico se resuelve mediante la cotización seleccionada |
| `reviews` | `id`, `serviceId`, `clientId`, `rating`, `comment`, `createdAt` | Una por servicio; rating entero 1–5; comentario opcional máximo 1000; inmutable |

Los campos de cancelación son `cancelledAt`, `cancelledByUserId` y `cancellationReason`; el motivo tiene 10–500 caracteres. La calificación promedio y cantidad de reseñas del técnico se calculan desde `reviews` y no se actualizan como columnas duplicadas.

### 5.2 Relaciones

```text
users 1---0..1 client_profiles ---1 districts
users 1---0..1 technician_profiles
technician_profiles *---* categories (technician_specialties)
client_profiles 1---* requests ---1 categories
requests *---1 districts
requests 1---* request_images
requests 1---* upload_reservations
requests 1---* quotes *---1 technician_profiles
requests 1---0..1 services ---1 quotes (selectedQuoteId)
services 1---0..1 reviews
```

### 5.3 Restricciones críticas

- Las claves foráneas impiden referencias a perfiles, categorías, distritos, solicitudes o cotizaciones inexistentes.
- Solo puede existir una cotización por solicitud y técnico.
- Solo puede existir un servicio por solicitud y una reseña por servicio.
- La cotización seleccionada debe pertenecer a la misma solicitud del servicio; esta invariante se valida en transacción y, cuando sea viable, mediante restricción SQL adicional.
- El correo almacenado en `users` es una copia de consulta sincronizada al establecer sesión; identidad, verificación y cambios de correo se resuelven desde Supabase Auth.
- La API cuenta reservas activas e imágenes confirmadas bajo bloqueo para no superar tres imágenes.
- Las comprobaciones de rol, propiedad, especialidad y transición se realizan dentro de la transacción que escribe.
- Borrar físicamente registros de negocio completados no forma parte del MVP. Los borradores abandonados y reservas temporales sí están sujetos a limpieza.

## 6. Máquinas de estado

### 6.1 Solicitud

| Estado origen | Acción | Actor | Estado destino | Condiciones |
|---|---|---|---|---|
| `DRAFT` | Publicar | Cliente propietario | `PUBLISHED` | Perfil y correo válidos, categoría/distrito activos, fecha futura, campos válidos y 1–3 imágenes confirmadas |
| `DRAFT` | Descartar | Cliente propietario | Eliminada | No visible; limpiar reservas y objetos |
| `PUBLISHED` | Seleccionar cotización | Cliente propietario | `ASSIGNED` | Cotización activa con disponibilidad todavía futura; crea servicio en la misma transacción |
| `PUBLISHED` | Cancelar | Cliente propietario | `CANCELLED` | Motivo válido; cierra cotizaciones activas |

`ASSIGNED` y `CANCELLED` son terminales para la solicitud. El progreso posterior se obtiene del servicio.

### 6.2 Cotización

| Estado | Operaciones permitidas |
|---|---|
| `SUBMITTED` | El técnico propietario puede editar o retirar mientras la solicitud siga `PUBLISHED`; el cliente puede seleccionarla |
| `WITHDRAWN` | El técnico puede editar y volver a enviar la misma cotización mientras la solicitud siga `PUBLISHED` |
| `SELECTED` | Terminal; se vincula al servicio |
| `CLOSED` | Terminal; otra propuesta fue elegida o la solicitud fue cancelada |

La selección bloquea la solicitud, marca una cotización `SELECTED`, marca las demás `CLOSED`, cambia la solicitud a `ASSIGNED` y crea el servicio.

### 6.3 Servicio

| Estado origen | Acción | Actor | Estado destino |
|---|---|---|---|
| `SCHEDULED` | Iniciar | Técnico seleccionado | `IN_PROGRESS` |
| `SCHEDULED` | Cancelar | Cliente propietario o técnico seleccionado | `CANCELLED` |
| `IN_PROGRESS` | Reportar trabajo terminado | Técnico seleccionado | `AWAITING_CONFIRMATION` |
| `IN_PROGRESS` | Cancelar | Cliente propietario o técnico seleccionado | `CANCELLED` |
| `AWAITING_CONFIRMATION` | Confirmar | Cliente propietario | `COMPLETED` |
| `AWAITING_CONFIRMATION` | Cancelar | Cliente propietario | `CANCELLED` |

`COMPLETED` y `CANCELLED` son terminales. Solo `COMPLETED` admite crear una reseña.

## 7. Contrato de API

### 7.1 Convenciones

- Base path: `/api/v1`.
- JSON en `camelCase` y UTF-8.
- Identificadores opacos como cadenas.
- Fechas y horas como RFC 3339 con offset; persistencia UTC y presentación `America/Lima`.
- Dinero como `{ "amount": "125.50", "currency": "PEN" }`.
- Paginación por página: `page` desde 1, `limit` por defecto 20 y máximo 100.
- Listas con orden estable y desempate por identificador.
- Errores `application/problem+json` con `type`, `title`, `status`, `detail`, `code`, `traceId` y errores por campo opcionales.
- `401` para sesión ausente/inválida, `403` para acción prohibida, `404` cuando no corresponde revelar existencia, `409` para estado o concurrencia incompatible, `422` para datos inválidos, `429` para límite y `503` para dependencia no disponible.

### 7.2 Superficie lógica

Autenticación se expone en el mismo origen de Next.js y delega en Supabase Auth. La API NestJS recibe únicamente tokens entre servidores.

Recursos principales de NestJS:

- `GET /categories` y `GET /districts` para catálogos activos.
- `GET/PATCH /me/profile` para el perfil del usuario autenticado.
- `POST /requests` para crear borrador; `GET/PATCH/DELETE /requests/{id}` para operar un borrador propio.
- `POST /requests/{id}/uploads` para reservar; `POST /requests/{id}/uploads/{uploadId}/confirm` para validar y vincular.
- `POST /requests/{id}/publish` para publicar de forma atómica.
- `GET /me/requests` para solicitudes del cliente y `GET /opportunities` para solicitudes elegibles del técnico.
- `GET /requests/{id}` con una proyección autorizada según rol y participación.
- `POST /requests/{id}/quotes`, `PATCH /quotes/{id}`, `POST /quotes/{id}/withdraw` y `POST /quotes/{id}/submit`.
- `GET /me/quotes` para las propuestas del técnico y `GET /requests/{id}/quotes` para el cliente propietario.
- `GET /technicians/{id}` y `GET /technicians/{id}/reviews` con proyección sin teléfono, accesibles al propio técnico o al cliente que recibió una cotización suya.
- `POST /requests/{id}/selection` con `quoteId` para seleccionar y crear el servicio.
- `GET /me/services` y `GET /services/{id}` para las partes asignadas.
- `POST /services/{id}/start`, `/report-complete`, `/confirm` y `/cancel` para comandos de estado explícitos.
- `POST /services/{id}/review` y consultas de reseñas autorizadas.

Los nombres finales del contrato se congelarán en OpenAPI antes de implementar la web. No se expondrá un endpoint genérico que permita escribir un estado arbitrario.

### 7.3 Compatibilidad

- Cambios aditivos compatibles pueden permanecer en `v1`.
- Eliminar campos, cambiar semántica o volver obligatorio un campo previamente opcional requiere nueva versión o migración coordinada.
- Integración continua generará o validará el cliente web y fallará ante diferencias no confirmadas.

## 8. Autenticación y autorización

### 8.1 Sesión

- Supabase exige verificación de correo antes de emitir una sesión operativa.
- Next.js conserva sesión y renovación en cookies `Secure`, `HttpOnly` y `SameSite` configuradas explícitamente.
- Tras la primera sesión verificada, la API crea de forma idempotente `users` con el rol elegido una sola vez. Repetir el onboarding reconcilia un alta parcial de Auth sin permitir cambiar el rol existente.
- Mutaciones del BFF verifican origen y protección CSRF.
- NestJS valida firma JWT mediante JWKS, emisor, audiencia, expiración y sujeto; después carga rol y perfil desde PostgreSQL.
- Los tokens, cookies, contraseñas y URLs firmadas no aparecen en logs.

### 8.2 Matriz de acceso

| Recurso/acción | Cliente | Técnico | Condición adicional |
|---|---|---|---|
| Crear/editar/publicar solicitud | Sí | No | Cliente propietario, correo verificado |
| Ver borrador | Sí | No | Solo propietario |
| Ver oportunidad publicada | No | Sí | Categoría dentro de especialidades activas |
| Cotizar | No | Sí | Perfil completo, especialidad coincidente, solicitud `PUBLISHED` |
| Ver cotizaciones de solicitud | Sí | No | Cliente propietario |
| Editar/retirar cotización | No | Sí | Técnico autor y solicitud `PUBLISHED` |
| Seleccionar cotización | Sí | No | Cliente propietario y solicitud `PUBLISHED` |
| Ver servicio | Sí | Sí | Cliente propietario o técnico seleccionado |
| Iniciar/reportar terminado | No | Sí | Técnico seleccionado y transición válida |
| Confirmar finalización | Sí | No | Cliente propietario y `AWAITING_CONFIRMATION` |
| Cancelar | Según fase | Según fase | ADR-0014 y transición válida |
| Crear reseña | Sí | No | Cliente propietario, servicio `COMPLETED`, sin reseña previa |
| Ver teléfonos | Sí | Sí | Solo partes del servicio ya asignado |

La API construye DTOs distintos para listados públicos, propuestas y servicios. Un campo no autorizado se omite en servidor; ocultarlo con CSS no es una medida de seguridad.

## 9. Fotografías

### 9.1 Política

- De una a tres imágenes confirmadas por solicitud publicada.
- Formatos reales permitidos: JPEG, PNG y WebP.
- Tamaño máximo: 5 MiB por objeto.
- Bucket privado; rutas aleatorias y no proporcionadas por el usuario.
- URL firmada de carga y lectura con 10 minutos de vigencia.
- El límite de 5 MiB equivale a 5 242 880 bytes y se comprueba después de cargar antes de vincular el objeto.
- La API autoriza cada lectura antes de emitir una URL.

### 9.2 Consistencia

La base de datos y Storage no comparten transacción. Para reducir inconsistencias:

- Cada carga parte de una reserva persistida con expiración.
- Confirmar verifica el objeto antes de crear `request_images`.
- Publicar bloquea el borrador y cuenta únicamente imágenes confirmadas.
- El comando periódico elimina reservas vencidas, objetos no vinculados y borradores abandonados según una ventana operativa configurada.
- La limpieza es idempotente y registra métricas de objetos examinados, eliminados y fallidos.

## 10. Estado y consistencia de la web

- TanStack Query usa claves que incluyen identidad, recurso, filtros y página.
- La caché privada vive solo en memoria y no se persiste en `localStorage`.
- Las respuestas privadas del BFF usan política `no-store` y nunca una caché pública compartida.
- Las mutaciones actualizan o invalidan consultas específicas al recibir éxito de la API.
- Selección, transición, cancelación y reseña no muestran éxito optimista.
- Un `409` invalida el recurso y presenta su estado actualizado con una acción comprensible.
- Estado de formularios por pasos puede vivir en React y en el borrador persistido; el borrador es la fuente recuperable.
- Cerrar sesión elimina datos privados de TanStack Query antes de navegar a una ruta pública.

## 11. Resiliencia y errores

- Toda dependencia tiene timeout explícito y configurable.
- Solo lecturas idempotentes pueden reintentarse automáticamente con backoff y jitter acotados.
- Una mutación con resultado incierto provoca una lectura de reconciliación antes de permitir repetirla.
- Las transacciones no contienen llamadas de red ni carga de archivos.
- Los bloqueos siguen un orden consistente y tienen tiempo de espera acotado.
- Logs JSON incluyen `timestamp`, nivel, servicio, entorno, `traceId`, ruta, estado y duración, sin datos sensibles.
- `GET /health/live` prueba el proceso; `GET /health/ready` comprueba dependencias imprescindibles con timeout.
- Los mensajes de usuario distinguen validación, permisos, conflicto y dependencia temporal sin exponer detalles internos.

## 12. Despliegue y configuración

### 12.1 Entornos

Como mínimo existirán entornos separados de desarrollo, prueba/preview y producción. Ningún preview usará la base o bucket de producción.

### 12.2 Pipeline

1. Instalar dependencias con lockfile inmutable.
2. Ejecutar análisis estático, comprobación de tipos y pruebas.
3. Generar OpenAPI y comprobar compatibilidad del cliente.
4. Construir web y API por separado.
5. Ejecutar migraciones una sola vez como release job de la API.
6. Desplegar API compatible con esquema anterior y nuevo cuando una migración lo requiera.
7. Desplegar web y ejecutar smoke tests del flujo de autenticación y health.

### 12.3 Secretos y conexiones

- Vercel no recibe credenciales privilegiadas de PostgreSQL o Storage.
- Railway conserva conexión PostgreSQL, verificación JWT y credenciales de Storage requeridas por la API.
- La conexión de runtime usa el pool compatible con transacciones de la plataforma; migraciones usan la conexión directa indicada por Supabase.
- Web, API, base y Storage se ubican en regiones geográficamente cercanas.
- Rotar un secreto no exige modificar código ni repositorio.

## 13. Estrategia de verificación

### Pruebas unitarias

- Matrices completas de transición de solicitud, cotización y servicio.
- Políticas de rol, propiedad, especialidad y participación.
- Validaciones de texto, dinero, fechas, imágenes y reseñas.
- Proyecciones que omiten teléfono y otros datos privados.

### Pruebas de integración

- Migraciones sobre PostgreSQL limpio y actualización desde la versión anterior.
- Selecciones concurrentes de cotizaciones distintas: exactamente una gana.
- Cotización concurrente con selección: no queda una propuesta activa después de asignar.
- Restricciones únicas de cotización, servicio y reseña.
- Rollback completo si falla una parte de selección o transición.
- Confirmación y limpieza de reservas de Storage con dobles de prueba o entorno aislado.

### Pruebas de contrato

- OpenAPI válido y estable.
- Cliente generado compila contra la web.
- Errores respetan `application/problem+json`.
- Dinero y timestamps conservan precisión y zona.

### Pruebas end-to-end

- Flujo completo de cliente y técnico desde registro hasta reseña.
- Accesos horizontales con otro cliente o técnico son rechazados.
- Token vencido, correo no verificado y CSRF no permiten mutaciones.
- URL firmada vencida o perteneciente a otra solicitud no concede acceso.
- Navegación usable a 360 px y 1280 px sin desbordamiento horizontal ni acciones inaccesibles.

## 14. Criterios de aceptación por flujo

### 14.1 Registro y perfil de cliente

- [ ] Un visitante puede registrar un correo no existente con rol `CLIENT` y una contraseña de al menos 8 caracteres.
- [ ] Un correo duplicado recibe una respuesta segura que no expone credenciales ni detalles internos.
- [ ] Antes de verificar el correo, el usuario no puede publicar, cotizar ni modificar servicios.
- [ ] Después de verificar, el cliente puede completar nombre de 2–100 caracteres, teléfono E.164 de 8–15 dígitos y un distrito activo.
- [ ] Un usuario cliente no puede crear perfil técnico ni acceder a rutas privadas de técnico.

### 14.2 Registro y perfil de técnico

- [ ] Un visitante puede registrar un correo no existente con rol `TECHNICIAN` y verificarlo.
- [ ] El técnico completa nombre profesional de 2–100, descripción de 20–1000, teléfono E.164, experiencia entera de 0–80 y al menos una especialidad activa.
- [ ] No se aceptan especialidades duplicadas ni categorías inactivas.
- [ ] El promedio mostrado coincide con las reseñas persistidas y muestra estado sin calificaciones cuando no existen.
- [ ] Un usuario técnico no puede crear solicitudes ni acceder a rutas privadas de cliente.

### 14.3 Borrador, imágenes y publicación

- [ ] Solo un cliente verificado puede crear un borrador y solo su propietario puede consultarlo o editarlo.
- [ ] Ningún borrador aparece en oportunidades ni acepta cotizaciones.
- [ ] Título, descripción, distrito, categoría y `preferredAt` respetan los límites y catálogos acordados.
- [ ] `preferredAt` incluye fecha y hora futuras, se transporta con zona y se almacena como instante UTC.
- [ ] Cada reserva de imagen comprueba propiedad, estado y cupo antes de emitir una URL de 10 minutos.
- [ ] Se aceptan únicamente JPEG, PNG o WebP de máximo 5 MiB según contenido real, no solo extensión o tipo declarado.
- [ ] Publicar con cero imágenes, más de tres o una carga sin confirmar devuelve validación y conserva `DRAFT`.
- [ ] Publicar con 1–3 imágenes confirmadas y todos los datos válidos cambia una sola vez a `PUBLISHED`.
- [ ] Repetir o competir el comando de publicación no crea duplicados ni expone un estado parcial.
- [ ] Descartar el borrador elimina o programa la eliminación segura de reservas y objetos asociados.

### 14.4 Descubrimiento de solicitudes

- [ ] Un técnico con perfil completo ve únicamente solicitudes `PUBLISHED` cuyas categorías están entre sus especialidades.
- [ ] El filtro por categoría rechaza categorías ajenas a sus especialidades o devuelve un conjunto vacío sin ampliar acceso.
- [ ] Borradores, solicitudes asignadas y canceladas no aparecen como oportunidades.
- [ ] La lista devuelve 20 elementos por defecto, nunca más de 100, con orden estable entre páginas.
- [ ] El detalle autorizado muestra las imágenes mediante URLs temporales y omite teléfonos.
- [ ] Un usuario no autorizado no puede reutilizar un identificador para obtener detalle o imágenes ajenas.

### 14.5 Envío y gestión de cotización

- [ ] Solo un técnico verificado, con perfil completo y especialidad coincidente puede cotizar una solicitud `PUBLISHED`.
- [ ] La cotización exige precio entre `0.01` y `999999.99`, moneda `PEN`, descripción de 10–1000 y `availableAt` futuro.
- [ ] Precio se transporta como texto decimal y no pierde precisión al persistir o mostrar.
- [ ] Existe como máximo una cotización por técnico y solicitud, incluso bajo peticiones concurrentes.
- [ ] El técnico puede editar, retirar y volver a enviar esa misma cotización mientras la solicitud siga `PUBLISHED`.
- [ ] Otro técnico no puede modificar ni retirar la cotización.
- [ ] Si la solicitud se asigna o cancela durante la operación, la API rechaza con conflicto y no deja cambios parciales.

### 14.6 Comparación y selección

- [ ] Solo el cliente propietario consulta las cotizaciones recibidas para su solicitud.
- [ ] La comparación muestra monto, moneda, descripción, disponibilidad, experiencia y reputación, pero no el teléfono del técnico.
- [ ] Seleccionar una cotización activa cambia la solicitud a `ASSIGNED`, marca esa propuesta `SELECTED`, cierra las demás y crea exactamente un servicio `SCHEDULED` en una transacción.
- [ ] Si `availableAt` ya pasó al seleccionar, la API rechaza la propuesta con validación o conflicto y no crea el servicio hasta que el técnico la actualice.
- [ ] `scheduledAt` se inicializa con `availableAt` de la propuesta elegida y conserva el mismo instante UTC.
- [ ] Dos selecciones concurrentes producen un solo servicio; la petición perdedora recibe conflicto y el estado vigente.
- [ ] Desde la selección no se aceptan nuevas cotizaciones ni ediciones de propuestas.
- [ ] Solo después de la selección, cliente y técnico elegido reciben mutuamente sus teléfonos; ningún tercero los recibe.

### 14.7 Seguimiento y transiciones

- [ ] Cliente propietario y técnico seleccionado pueden consultar el servicio; otros usuarios no.
- [ ] Solo el técnico seleccionado cambia `SCHEDULED` a `IN_PROGRESS`.
- [ ] Solo el técnico seleccionado cambia `IN_PROGRESS` a `AWAITING_CONFIRMATION`.
- [ ] Solo el cliente propietario cambia `AWAITING_CONFIRMATION` a `COMPLETED`.
- [ ] Cada transición inválida, repetida o ejecutada por otro rol se rechaza sin modificar datos.
- [ ] La línea de progreso distingue publicado, técnico seleccionado/programado, en proceso, pendiente de confirmación y finalizado.
- [ ] Un conflicto actualiza la vista con el estado autoritativo y un mensaje comprensible.

### 14.8 Cancelación

- [ ] El cliente propietario puede cancelar una solicitud `PUBLISHED` con motivo de 10–500 caracteres.
- [ ] Cliente propietario o técnico seleccionado pueden cancelar un servicio `SCHEDULED` o `IN_PROGRESS` con motivo válido.
- [ ] Solo el cliente puede cancelar desde `AWAITING_CONFIRMATION`.
- [ ] La cancelación registra actor y fecha y produce un estado terminal.
- [ ] Cancelar no reabre la solicitud, no reactiva cotizaciones ni asigna otro técnico.
- [ ] Servicios `COMPLETED` o `CANCELLED` no admiten nuevas transiciones.

### 14.9 Reseña y reputación

- [ ] Solo el cliente propietario puede reseñar un servicio `COMPLETED`.
- [ ] La calificación es un entero entre 1 y 5 y el comentario es opcional con máximo 1000 caracteres.
- [ ] Cada servicio admite una sola reseña aun bajo peticiones concurrentes.
- [ ] La reseña publicada es inmutable en el MVP.
- [ ] Crear la reseña actualiza el promedio derivado que se muestra para el técnico sin almacenar un promedio divergente.
- [ ] Servicios cancelados o pendientes de confirmación no admiten reseñas.

### 14.10 Seguridad y privacidad

- [ ] Todas las rutas privadas rechazan sesión ausente, vencida o inválida.
- [ ] La API valida rol, propiedad y participación aunque la web o el BFF envíen identificadores manipulados.
- [ ] Cookies de sesión son `Secure`, `HttpOnly` y `SameSite`; mutaciones fallan ante origen o CSRF inválido.
- [ ] La web no accede directamente a tablas y el navegador no recibe credenciales privilegiadas.
- [ ] Fotografías permanecen privadas y una URL vencida deja de conceder acceso.
- [ ] Las respuestas anteriores a la asignación omiten teléfonos en el JSON.
- [ ] Errores y logs no contienen contraseñas, tokens, cookies, SQL, secretos ni URLs firmadas completas.
- [ ] Secretos de producción no existen en el repositorio ni en artefactos del frontend.

### 14.11 Operación, errores y responsive

- [ ] Listas de solicitudes, cotizaciones y servicios están paginadas con máximo 100 elementos por respuesta.
- [ ] Lecturas transitorias pueden reintentarse de forma acotada; mutaciones no se repiten automáticamente.
- [ ] Fallos de una dependencia producen un error uniforme y no dejan selección o transición parcial.
- [ ] Health checks distinguen proceso vivo de servicio listo para tráfico.
- [ ] Migraciones se ejecutan una sola vez y el despliegue falla sin promover la API si una migración falla.
- [ ] La aplicación está desplegada en Vercel y Railway y utiliza un entorno Supabase no compartido con pruebas.
- [ ] A 360 px y 1280 px, los flujos principales no tienen desbordamiento horizontal, controles fuera de pantalla ni texto de estado truncado de forma inaccesible.
- [ ] Formularios muestran errores por campo y conservan datos no sensibles después de una validación fallida.

## 15. Riesgos técnicos abiertos

- No existe `Design.md`; los prototipos de Stitch pueden revelar nuevos campos o estados. Cualquier diferencia que afecte persistencia o permisos debe producir una revisión de este documento y, si corresponde, una ADR.
- No hay objetivo de carga, SLO ni presupuesto operativo. Antes de producción real deben medirse volumen esperado, latencia y cuotas de Vercel, Railway y Supabase.
- Un servicio puede permanecer indefinidamente en `AWAITING_CONFIRMATION`; cierre automático, recordatorios y disputas están fuera del MVP.
- Las cargas directas no son atómicas con PostgreSQL. El comando periódico y la observabilidad de huérfanos son obligatorios para controlar costo y privacidad.
- La disponibilidad de correo de verificación depende de la configuración y cuotas del proveedor; debe validarse el remitente antes de una demo o lanzamiento.
- La estrategia de backup, retención y restauración depende del plan Supabase elegido y debe probarse antes de almacenar datos reales.
- La cobertura se limita a Lima Metropolitana y Callao. Expandirla exige cargar UBIGEO y revisar comunicación del producto, no cambiar el esquema.
- No hay aclaraciones previas por teléfono ni chat antes de seleccionar. Si las descripciones resultan insuficientes durante validación, será una decisión de producto nueva, no un cambio silencioso de privacidad.
