# PRD: ReparaRed

**Versión:** 1.0  
**Tipo de proyecto:** Aplicación web responsive  
**Estado:** MVP para proyecto final del curso

## 1. Descripción del producto

ReparaRed es una plataforma web que conecta personas que necesitan una reparación doméstica con técnicos independientes.

Un cliente podrá publicar una solicitud explicando el problema y adjuntando fotografías. Los técnicos podrán revisar las solicitudes disponibles y enviar cotizaciones. Finalmente, el cliente elegirá una propuesta y podrá seguir el estado básico del servicio hasta su finalización.

El proyecto busca organizar en una sola plataforma un proceso que actualmente suele realizarse de manera informal mediante recomendaciones, llamadas o mensajes de WhatsApp.

## 2. Problema

Las personas que necesitan una reparación doméstica suelen tener dificultades para:

- Encontrar técnicos disponibles.
- Conocer previamente un precio aproximado.
- Comparar distintas alternativas.
- Revisar la experiencia de un técnico.
- Mantener ordenada la información del servicio.

Por otro lado, muchos técnicos independientes dependen de recomendaciones personales y no cuentan con una plataforma sencilla para encontrar oportunidades y presentar sus cotizaciones.

## 3. Público objetivo

### Clientes

Personas que necesitan resolver una reparación o trabajo técnico básico en su hogar.

### Técnicos

Trabajadores independientes que ofrecen servicios de reparación y mantenimiento doméstico.

## 4. Propuesta de valor

### Para clientes

Publicar una necesidad, recibir diferentes cotizaciones y elegir un técnico desde una sola plataforma.

### Para técnicos

Encontrar solicitudes relacionadas con su especialidad, presentar propuestas y construir una reputación mediante trabajos completados y calificaciones.

## 5. Objetivo del MVP

Construir una aplicación funcional que valide el siguiente flujo:

1. Un cliente publica una solicitud.
2. Un técnico encuentra la solicitud.
3. El técnico envía una cotización.
4. El cliente compara las propuestas.
5. El cliente selecciona un técnico.
6. El técnico actualiza el progreso del servicio.
7. El cliente confirma la finalización.
8. El cliente califica al técnico.

## 6. Alcance funcional

### Funciones del cliente

- Registrarse e iniciar sesión.
- Completar un perfil básico.
- Crear una solicitud de reparación.
- Seleccionar la categoría del servicio.
- Describir el problema.
- Adjuntar hasta tres fotografías.
- Indicar distrito y fecha preferida.
- Consultar sus solicitudes.
- Revisar las cotizaciones recibidas.
- Seleccionar una cotización.
- Consultar el estado del servicio.
- Confirmar la finalización.
- Calificar al técnico.

### Funciones del técnico

- Registrarse e iniciar sesión.
- Crear un perfil profesional.
- Seleccionar una o más especialidades.
- Consultar solicitudes disponibles.
- Filtrar solicitudes por categoría.
- Revisar el detalle de una solicitud.
- Enviar una cotización.
- Consultar sus cotizaciones.
- Revisar los servicios que le fueron asignados.
- Actualizar el estado del servicio.
- Consultar sus calificaciones.

## 7. Categorías iniciales

El MVP tendrá cuatro categorías:

1. Gasfitería y tuberías.
2. Electricidad básica.
3. Reparación de muebles.
4. Limpieza especializada.

Las categorías solamente se utilizarán para organizar y filtrar las solicitudes.

## 8. Funciones fuera del alcance

Esta primera versión no incluirá:

- Pagos dentro de la plataforma.
- Geolocalización en tiempo real.
- Visualización en mapas.
- Asignación automática de técnicos.
- Chat en tiempo real.
- Notificaciones push.
- Sistema de garantías.
- Gestión de reclamos.
- Verificación oficial de identidad.
- Aplicación móvil nativa.
- Recomendaciones mediante inteligencia artificial.
- Suscripciones.
- Panel administrativo avanzado.

El cliente y el técnico podrán coordinar el pago y los detalles finales fuera de la plataforma después de seleccionar la cotización.

## 9. Historias de usuario principales

### HU-01 — Registro

Como visitante, quiero registrarme como cliente o técnico para utilizar las funciones correspondientes a mi perfil.

### HU-02 — Crear solicitud

Como cliente, quiero publicar una solicitud con una descripción y fotografías para explicar el trabajo que necesito.

### HU-03 — Buscar solicitudes

Como técnico, quiero revisar las solicitudes disponibles para encontrar oportunidades relacionadas con mi especialidad.

### HU-04 — Enviar cotización

Como técnico, quiero enviar una propuesta con precio, descripción y disponibilidad para ofrecer mis servicios.

### HU-05 — Comparar propuestas

Como cliente, quiero revisar las cotizaciones recibidas para seleccionar la que considere más adecuada.

### HU-06 — Seleccionar técnico

Como cliente, quiero aceptar una cotización para asignar el servicio a un técnico.

### HU-07 — Actualizar servicio

Como técnico, quiero actualizar el estado del servicio para que el cliente conozca su progreso.

### HU-08 — Finalizar servicio

Como cliente, quiero confirmar que el trabajo terminó para cerrar la solicitud.

### HU-09 — Calificar técnico

Como cliente, quiero dejar una calificación y comentario sobre el servicio recibido.

## 10. Flujo principal

### Flujo del cliente

1. Se registra como cliente.
2. Ingresa a su dashboard.
3. Selecciona "Publicar solicitud".
4. Completa los datos del problema.
5. Adjunta fotografías.
6. Publica la solicitud.
7. Recibe cotizaciones.
8. Compara las propuestas.
9. Selecciona una cotización.
10. Revisa el estado del servicio.
11. Confirma que el trabajo terminó.
12. Publica una calificación.

### Flujo del técnico

1. Se registra como técnico.
2. Completa su perfil y especialidades.
3. Ingresa a la lista de solicitudes.
4. Filtra las oportunidades.
5. Revisa una solicitud.
6. Envía una cotización.
7. El cliente acepta su propuesta.
8. Consulta el servicio asignado.
9. Actualiza su estado.
10. Finaliza el trabajo.
11. Recibe una calificación.

## 11. Estados del servicio

El servicio tendrá los siguientes estados:

- Publicado.
- Técnico seleccionado.
- Programado.
- En proceso.
- Finalizado.
- Cancelado.

Las transiciones se controlarán desde el backend para evitar cambios inválidos.

## 12. Reglas de negocio

1. Solo los clientes pueden publicar solicitudes.
2. Solo los técnicos pueden enviar cotizaciones.
3. Un técnico solo puede cotizar solicitudes relacionadas con sus especialidades.
4. Una solicitud puede recibir varias cotizaciones.
5. El cliente solo puede seleccionar una cotización.
6. Al seleccionar una propuesta, la solicitud deja de aceptar nuevas cotizaciones.
7. Solo el técnico seleccionado puede actualizar el servicio.
8. Solo el cliente propietario puede confirmar la finalización.
9. Una solicitud finalizada solo puede recibir una calificación.
10. Cada servicio puede recibir una única reseña.

## 13. Pantallas principales

### Públicas

- Landing page.
- Registro.
- Inicio de sesión.

### Cliente

- Dashboard del cliente.
- Crear solicitud.
- Mis solicitudes.
- Detalle de solicitud.
- Comparación de cotizaciones.
- Seguimiento del servicio.
- Formulario de calificación.
- Perfil.

### Técnico

- Dashboard del técnico.
- Solicitudes disponibles.
- Detalle de solicitud.
- Formulario de cotización.
- Mis cotizaciones.
- Servicios asignados.
- Seguimiento del servicio.
- Perfil profesional.

## 14. Modelo de datos simplificado

### Usuario

- ID.
- Correo.
- Contraseña o identificador de autenticación.
- Rol.
- Fecha de registro.

### Perfil del cliente

- ID.
- Usuario.
- Nombre.
- Teléfono.
- Distrito.

### Perfil del técnico

- ID.
- Usuario.
- Nombre profesional.
- Descripción.
- Teléfono.
- Años de experiencia.
- Calificación promedio.

### Categoría

- ID.
- Nombre.

### Especialidad del técnico

- Técnico.
- Categoría.

### Solicitud

- ID.
- Cliente.
- Categoría.
- Título.
- Descripción.
- Distrito.
- Fecha preferida.
- Estado.
- Fecha de publicación.

### Imagen de solicitud

- ID.
- Solicitud.
- URL de imagen.

### Cotización

- ID.
- Solicitud.
- Técnico.
- Precio.
- Descripción.
- Fecha disponible.
- Estado.

### Servicio

- ID.
- Solicitud.
- Cotización seleccionada.
- Cliente.
- Técnico.
- Estado.
- Fecha programada.

### Reseña

- ID.
- Servicio.
- Cliente.
- Técnico.
- Calificación.
- Comentario.

## 15. Componentes técnicos

### Frontend

Aplicación web responsive responsable de:

- Interfaces.
- Formularios.
- Navegación.
- Visualización de datos.
- Consumo de la API.

### Backend

API responsable de:

- Autenticación y autorización.
- Reglas de negocio.
- Solicitudes.
- Cotizaciones.
- Servicios.
- Reseñas.

### Base de datos

Base de datos relacional para almacenar la información persistente del sistema.

### Almacenamiento de imágenes

Servicio externo para guardar las fotografías de las solicitudes.

## 16. Stack tentativo

- Frontend: Next.js, React y TypeScript.
- Backend: FastAPI o NestJS.
- Base de datos: PostgreSQL o Supabase.
- Autenticación: Supabase Auth, Clerk o servicio equivalente.
- Imágenes: Supabase Storage o Cloudinary.
- Despliegue: Vercel para frontend y Render o Railway para backend.

El stack definitivo se decidirá durante la etapa de arquitectura.

## 17. Requisitos no funcionales

### Seguridad

- Proteger rutas privadas.
- Validar roles desde el backend.
- Evitar que un usuario consulte o modifique información ajena.
- Validar los datos de los formularios.
- Restringir tamaño y formato de imágenes.
- Mantener secretos y credenciales fuera del repositorio.

### Experiencia de usuario

- Diseño responsive.
- Formularios sencillos.
- Estados claramente visibles.
- Mensajes comprensibles de error y confirmación.
- Navegación diferente según el rol.

### Rendimiento

- Uso de paginación en listas.
- Optimización de imágenes.
- Consultas de base de datos eficientes.

## 18. Dirección de diseño

La interfaz debe transmitir:

- Confianza.
- Cercanía.
- Sencillez.
- Orden.
- Profesionalismo.

La experiencia debe estar optimizada principalmente para dispositivos móviles, aunque la aplicación será web responsive.

Los componentes principales serán:

- Tarjetas de solicitudes.
- Tarjetas de cotizaciones.
- Perfiles de técnicos.
- Etiquetas de estado.
- Formularios por pasos.
- Línea de progreso del servicio.

Stitch se utilizará para generar los prototipos iniciales. Claude Design u Open Design se empleará posteriormente para refinar jerarquía, espaciado, tipografía, consistencia y adaptación responsive.

## 19. Criterios de aceptación

El MVP se considerará terminado cuando:

- Un cliente pueda registrarse.
- Un técnico pueda registrarse.
- El cliente pueda publicar una solicitud con fotografías.
- El técnico pueda encontrar la solicitud.
- El técnico pueda enviar una cotización.
- El cliente pueda comparar y seleccionar una propuesta.
- Se cree un servicio al aceptar la cotización.
- El técnico pueda actualizar el estado.
- El cliente pueda confirmar la finalización.
- El cliente pueda calificar al técnico.
- Los datos permanezcan almacenados.
- Exista autorización por roles.
- La aplicación esté desplegada.
- La interfaz sea usable desde computadora y teléfono.
