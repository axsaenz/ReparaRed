# ADR 0007: Prisma para persistencia y migraciones

## Estado

Aceptado

## Contexto

La API NestJS debe persistir un modelo relacional normalizado en PostgreSQL, ejecutar de forma atómica la aceptación de una cotización y mantener restricciones como un servicio por solicitud y una reseña por servicio. El equipo trabaja principalmente con TypeScript y necesita migraciones reproducibles para los entornos local, de prueba y desplegado.

## Decisión

Se usará Prisma ORM como cliente de PostgreSQL y herramienta principal de migraciones. El esquema Prisma describirá entidades, relaciones, enumeraciones e índices soportados, y el cliente se encapsulará detrás de los servicios de persistencia de la API.

Las operaciones que cambian varias entidades, en especial seleccionar una cotización, actualizar la solicitud, cerrar propuestas competidoras y crear el servicio, se ejecutarán mediante una transacción de base de datos. Las restricciones críticas también existirán en PostgreSQL para que la corrección no dependa únicamente de comprobaciones previas en la aplicación.

Cuando Prisma no pueda expresar una restricción, índice o migración PostgreSQL necesaria, la migración versionada incluirá SQL explícito. No se usará sincronización automática destructiva del esquema en entornos compartidos o productivos.

## Alternativas consideradas

- **Drizzle ORM** — mantiene el esquema TypeScript cerca de SQL y ofrece control directo de PostgreSQL con poco runtime, pero no se eligió porque requiere más trabajo manual de consulta y convenciones para un equipo que prioriza velocidad de implementación del MVP.
- **TypeORM** — tiene integración directa con NestJS y un patrón repository conocido, pero no se eligió por su menor precisión de tipos en varias operaciones, el acoplamiento de entidades mediante decoradores y una experiencia de migraciones menos predecible.

## Consecuencias

- El cliente generado reduce errores de nombres y tipos y agiliza las operaciones CRUD y relaciones del modelo.
- Las migraciones forman parte del repositorio y permiten revisar cómo evoluciona la base de datos.
- Prisma añade una abstracción y generación de cliente propias; el equipo deberá conocer sus límites de conexión, transacción y consulta.
- Las capacidades avanzadas de PostgreSQL pueden requerir SQL manual, que deberá probarse y conservarse aunque no aparezca completamente en el esquema Prisma.
