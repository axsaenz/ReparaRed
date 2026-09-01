# ADR 0012: Imágenes privadas con URLs firmadas

## Estado

Aceptado

## Contexto

Cada solicitud puede incluir hasta tres fotografías que potencialmente muestran espacios privados del hogar. El PRD exige restringir tamaño y formato y evitar que un usuario consulte información ajena. Supabase Storage administrará los objetos, pero la sesión permanecerá en el BFF de Next.js y el navegador no tendrá credenciales privilegiadas de Storage.

## Decisión

Las imágenes se almacenarán en un bucket privado de Supabase Storage y se transferirán mediante URLs firmadas de corta duración.

El flujo de carga será:

1. El cliente autenticado solicita al BFF una reserva de carga con nombre, tamaño y tipo declarados.
2. NestJS verifica identidad, propiedad de la solicitud, estado que permite edición y cupo máximo de tres imágenes, contando reservas activas.
3. La API crea una ruta aleatoria no controlada por el usuario y devuelve una URL de carga temporal con las restricciones soportadas por Storage.
4. El navegador carga el objeto directamente en Supabase Storage y confirma la operación por el BFF.
5. La API comprueba existencia, tamaño y formato real permitido antes de crear `request_images`. Si falla, rechaza la vinculación y elimina el objeto cuando sea posible.

Las reservas expirarán. Un comando periódico de mantenimiento, empaquetado con la API y ejecutado por la plataforma, eliminará reservas vencidas y objetos no vinculados. La publicación de una solicitud solo considerará imágenes confirmadas.

Para lectura, NestJS autorizará primero que el usuario puede consultar el detalle de la solicitud y emitirá una URL firmada de corta duración. PostgreSQL almacenará la ruta estable del objeto y sus metadatos, nunca la URL temporal. Las respuestas privadas y URLs firmadas no se almacenarán en cachés públicas.

## Alternativas consideradas

- **Carga y lectura mediante proxy de Next.js o NestJS** — permite inspeccionar el archivo antes de enviarlo y oculta completamente Storage, pero no se eligió porque duplica ancho de banda, aumenta latencia y queda sujeto a límites de cuerpo y duración de las plataformas de aplicación.
- **Bucket público con rutas no adivinables** — simplifica entrega y caché, pero no se eligió porque una URL filtrada conserva acceso indefinido, dificulta revocación y no constituye autorización suficiente para fotografías privadas.

## Consecuencias

- Los bytes viajan directamente entre navegador y Storage sin exponer credenciales generales ni consumir el ancho de banda de la API.
- La lectura depende de una decisión de autorización actual y puede revocarse al vencer la URL firmada.
- El flujo requiere reservas, confirmación y limpieza de huérfanos, por lo que no es atómico entre PostgreSQL y Storage.
- La verificación real del archivo añade una operación posterior a la carga y la interfaz debe representar estados de carga, validación y rechazo.
- El límite, formatos permitidos y duración de las URLs deberán ser configurables y quedar fijados en criterios de aceptación.
