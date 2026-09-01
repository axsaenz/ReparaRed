# ADR 0011: Next.js como BFF de sesión

## Estado

Aceptado

## Contexto

La aplicación web se desplegará en Vercel, la API en Railway y la identidad será administrada por Supabase Auth. El PRD exige proteger rutas privadas y validar rol y propiedad en el backend. Es necesario decidir cómo conservar la sesión del navegador y cómo presentar el token a NestJS sin convertir la web en una segunda autoridad del dominio.

## Decisión

Next.js actuará como Backend for Frontend de sesión. El navegador se comunicará únicamente con su mismo origen para iniciar o cerrar sesión y para consumir datos privados. La sesión se mantendrá mediante cookies `Secure`, `HttpOnly` y con una política `SameSite` explícita; los Route Handlers renovarán la sesión en el servidor cuando corresponda y enviarán a NestJS un token de acceso de corta duración en el encabezado `Authorization`.

Los Route Handlers serán adaptadores explícitos para las operaciones que usa la web y consumirán el cliente derivado del contrato OpenAPI. No funcionarán como un proxy abierto, no accederán directamente a las tablas de dominio y no duplicarán reglas de autorización o negocio. NestJS verificará cada token y seguirá siendo la autoridad final.

Las mutaciones originadas en el navegador comprobarán origen y aplicarán protección CSRF acorde con la configuración de cookies. Los datos de sesión no se incluirán en JavaScript, HTML generado, logs ni respuestas de error.

## Alternativas consideradas

- **Navegador directo a NestJS con Bearer token** — reduce un salto y permite consumir OpenAPI directamente desde TanStack Query, pero no se eligió porque requiere exponer el token al contexto JavaScript, administrar CORS y renovar la sesión en el cliente.
- **Cookie compartida enviada directamente a NestJS** — mantiene el token fuera de JavaScript y evita el salto por Next.js, pero no se eligió por la complejidad de dominios, CSRF, renovación y compatibilidad con ambientes preview de Vercel.

## Consecuencias

- Los tokens de sesión no quedan disponibles para scripts del navegador y el tráfico privado del cliente permanece en el mismo origen.
- NestJS conserva la validación de identidad, rol, propiedad y reglas de dominio en cada operación.
- Cada operación privada añade un salto por Vercel, con mayor latencia y consumo de funciones.
- La web debe mantener adaptadores BFF y comprobar que sigan siendo compatibles con OpenAPI sin duplicar modelos manualmente.
- La seguridad depende de una implementación correcta de cookies, renovación, verificación de origen y protección CSRF.
