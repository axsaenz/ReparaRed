# ADR 0019: Borrador privado antes de publicar una solicitud

## Estado

Aceptado

## Contexto

La solicitud debe publicarse con entre una y tres imágenes ya validadas, pero el flujo de URLs firmadas necesita asociar reservas y objetos a un propietario antes de completar la carga. Crear primero una solicitud visible expondría registros incompletos a técnicos y permitiría cotizar mientras todavía se validan fotografías.

## Decisión

`requests` incorporará el estado interno `DRAFT`. El cliente autenticado creará y editará su propio borrador, reservará y confirmará imágenes sobre él, y finalmente ejecutará un comando explícito `publish`.

La publicación se realizará en una transacción que bloqueará el borrador y comprobará:

- Propiedad, rol de cliente y correo verificado.
- Perfil requerido completo.
- Título, descripción y fecha/hora preferida válidos.
- Categoría y distrito activos.
- Entre una y tres imágenes confirmadas, con formato y tamaño permitidos.
- Estado actual `DRAFT`.

Solo después de superar todas las condiciones la solicitud pasará a `PUBLISHED` y será visible para técnicos elegibles. Los borradores nunca aparecerán en listados de oportunidades ni aceptarán cotizaciones. El cliente podrá descartar su borrador; borradores y reservas abandonados estarán sujetos al proceso de limpieza definido para imágenes temporales.

## Alternativas consideradas

- **Entidad separada de sesión de publicación** — mantiene `requests` exclusivamente para solicitudes públicas, pero no se eligió porque duplica campos, relaciones y lógica al convertir la sesión temporal en una solicitud definitiva.
- **Estado técnico `PENDING_MEDIA`** — oculta la solicitud mientras se validan imágenes, pero no se eligió porque modela un detalle de procesamiento como si fuera una fase del dominio y ofrece peor soporte para formularios guardados parcialmente.

## Consecuencias

- Ningún técnico ve una solicitud incompleta y la publicación tiene un único punto de validación autoritativo.
- El cliente puede conservar temporalmente el progreso de un formulario por pasos.
- Se agrega un estado interno no mostrado en la lista original del PRD y deben existir reglas de acceso específicas para borradores.
- La limpieza de borradores abandonados debe evitar eliminar uno que todavía tenga actividad reciente y debe borrar también sus objetos no vinculados.
