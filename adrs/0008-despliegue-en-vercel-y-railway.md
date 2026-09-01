# ADR 0008: Despliegue de la web en Vercel y la API en Railway

## Estado

Aceptado

## Contexto

El PRD exige que el MVP esté desplegado. El monorepo contiene una aplicación Next.js y una API NestJS desplegables de forma independiente, mientras Supabase administra PostgreSQL, autenticación y objetos. Next.js se beneficia de la integración nativa de Vercel y NestJS requiere un runtime Node.js persistente con control de variables y proceso de inicio.

## Decisión

La aplicación web se desplegará en Vercel y la API NestJS en Railway. Cada plataforma observará únicamente la aplicación y los paquetes del monorepo que necesita construir. Los despliegues de producción se originarán desde la rama protegida definida por el proyecto, después de superar compilación, análisis estático y pruebas automatizadas.

La API, PostgreSQL y Storage se configurarán en regiones compatibles o geográficamente cercanas. Las migraciones Prisma se ejecutarán una sola vez como paso controlado de release antes de promover la nueva versión de la API, y no de forma concurrente al iniciar cada réplica.

Vercel recibirá solo variables públicas o credenciales estrictamente necesarias para la web. Secretos de conexión, claves privilegiadas de Supabase y configuración interna permanecerán en Railway o en el gestor seguro de la plataforma correspondiente.

## Alternativas consideradas

- **Vercel para la web y Render para la API** — ofrece una separación equivalente con un servicio Node administrado, pero no se eligió por el riesgo de suspensión o arranque en frío en planes de entrada y una menor preferencia operativa para este stack.
- **Railway para web y API** — concentra variables, logs y despliegues en una plataforma, pero no se eligió porque pierde parte de la integración de previews, renderizado y optimización específica que Vercel ofrece para Next.js.

## Consecuencias

- Cada aplicación usa una plataforma alineada con su runtime y puede desplegarse de forma independiente.
- El equipo debe mantener variables, observabilidad, límites y costos en Vercel, Railway y Supabase.
- Una mala elección de regiones aumentaría la latencia de cada operación de la API; la cercanía geográfica pasa a ser una condición de despliegue.
- Las migraciones requieren un paso de release coordinado y una estrategia compatible hacia atrás cuando una versión anterior de la API aún pueda recibir tráfico.
