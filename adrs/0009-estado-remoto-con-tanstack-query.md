# ADR 0009: Estado remoto con TanStack Query y estado local con React

## Estado

Aceptado

## Contexto

Los dashboards de cliente y técnico muestran solicitudes, cotizaciones y servicios paginados cuyo contenido cambia después de mutaciones relevantes. La API y PostgreSQL son la fuente de verdad, mientras la web debe representar carga, error, datos vacíos y actualización sin mantener una copia global que pueda divergir. Next.js también permite preparar datos durante el renderizado inicial.

## Decisión

La aplicación web usará TanStack Query para consultar, cachear e invalidar estado remoto proveniente de la API. React administrará estado efímero de interfaz y formularios que todavía no haya sido enviado. No se introducirá un store global adicional para duplicar entidades del servidor.

Las claves de consulta se definirán de manera consistente por recurso, identidad, filtros y página. Después de una mutación exitosa se actualizará o invalidará únicamente el conjunto afectado. Las operaciones críticas, como seleccionar una cotización o cambiar el estado del servicio, esperarán la respuesta autoritativa de la API en lugar de mostrar un éxito optimista que pueda ocultar un conflicto.

Cuando una página se beneficie de datos iniciales renderizados en el servidor, Next.js podrá precargar y deshidratar la consulta para que TanStack Query continúe su ciclo en el cliente sin una segunda fuente de verdad. La caché con datos privados no se persistirá en almacenamiento duradero del navegador.

## Alternativas consideradas

- **Solo primitivas de Next.js y React** — reduce dependencias y funciona bien para páginas principalmente de lectura, pero no se eligió porque los dashboards, filtros y mutaciones frecuentes requerirían revalidación y estados asíncronos repetidos o recargas más amplias.
- **Store global cliente con Zustand** — permite compartir datos mediante un modelo explícito, pero no se eligió porque obliga a implementar manualmente caché, deduplicación, paginación, reintentos e invalidación y puede convertir el navegador en una fuente de verdad accidental.

## Consecuencias

- Las consultas remotas tendrán manejo uniforme de caché, carga, error e invalidación y podrán reutilizarse entre componentes.
- La respuesta de la API seguirá determinando el resultado de transiciones sensibles y conflictos concurrentes.
- El equipo debe diseñar claves de consulta estables y evitar invalidaciones globales que degraden rendimiento o experiencia.
- La integración de hidratación entre componentes de servidor y cliente añade configuración y puede producir dobles solicitudes si los tiempos de frescura no se alinean.
