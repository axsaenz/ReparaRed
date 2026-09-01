# ADR 0006: Supabase para datos, identidad y almacenamiento de objetos

## Estado

Aceptado

## Contexto

El PRD requiere una base relacional, registro e inicio de sesión para clientes y técnicos, protección de rutas, autorización desde el backend y almacenamiento externo de hasta tres fotografías por solicitud. También exige mantener secretos fuera del repositorio y restringir formato y tamaño de imágenes. Para el MVP conviene minimizar proveedores y carga operativa sin trasladar las reglas de negocio fuera de la API acordada.

## Decisión

Se usará un proyecto Supabase administrado para PostgreSQL, Supabase Auth y Supabase Storage.

- Supabase Auth administrará credenciales, sesiones, recuperación y emisión de tokens.
- La API NestJS verificará la firma, emisor, audiencia y vigencia de cada token y vinculará su sujeto con `users`.
- El rol de dominio y los datos de perfil se almacenarán en las tablas de la aplicación; la API no confiará para autorizar en metadatos editables enviados por el cliente.
- NestJS será la única puerta de lectura y escritura para las tablas del dominio. La aplicación web no consultará directamente la base de datos mediante el SDK de Supabase.
- Supabase Storage guardará los objetos de imagen; PostgreSQL conservará únicamente su identificador o ruta estable y metadatos necesarios, no una URL firmada temporal.
- Migraciones versionadas en el monorepo definirán el esquema y las restricciones de PostgreSQL.

La política de visibilidad y el flujo exacto de carga de fotografías se definirán como una decisión de seguridad separada.

## Alternativas consideradas

- **Neon, Clerk y Cloudinary** — proporciona servicios especializados e independencia de sustitución para base, identidad e imágenes, pero no se eligió porque multiplica SDK, secretos, límites, callbacks y puntos de fallo para un MVP de equipo pequeño.
- **PostgreSQL y objetos administrados con autenticación propia** — ofrece control completo sobre identidad y sesiones, pero no se eligió porque implementar contraseñas, recuperación y protección de cuentas añade riesgo de seguridad y trabajo fuera de la propuesta de valor.

## Consecuencias

- Un solo proveedor reduce configuración, credenciales y operación inicial, y PostgreSQL conserva un modelo relacional portable.
- Centralizar el dominio en NestJS evita políticas divergentes entre acceso directo desde la web y la API.
- La aplicación depende de la disponibilidad, cuotas y semántica de tres productos Supabase; una migración futura de autenticación o almacenamiento no será transparente.
- La API debe administrar correctamente conexiones PostgreSQL y verificar tokens sin depender de llamadas remotas a Supabase en cada petición.
- El equipo deberá mantener separadas las migraciones del dominio y la configuración del proveedor, incluyendo buckets, claves y políticas.
