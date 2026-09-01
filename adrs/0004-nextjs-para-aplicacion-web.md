# ADR 0004: Next.js App Router para la aplicación web

## Estado

Aceptado

## Contexto

El PRD propone tentativamente Next.js, React y TypeScript. ReparaRed requiere una landing pública, registro e inicio de sesión, áreas privadas diferenciadas por rol, formularios por pasos, carga y optimización de imágenes y una experiencia responsive priorizada para móviles. El equipo manifiesta mayor familiaridad con TypeScript y Node.js.

## Decisión

La aplicación web se implementará con una versión estable y soportada de Next.js usando App Router, React y TypeScript. Los layouts y segmentos de rutas separarán las páginas públicas, las funciones del cliente y las funciones del técnico. Se aprovechará renderizado en servidor para contenido público y carga inicial cuando sea conveniente, y componentes de cliente solo para interacción y estado local.

La API independiente seguirá siendo la única autoridad para autorización, reglas de negocio y persistencia. Los Route Handlers o Server Actions de Next.js no duplicarán esas reglas; si se utilizan, actuarán únicamente como adaptadores de presentación hacia la API.

## Alternativas consideradas

- **React SPA con Vite y TypeScript** — ofrece compilación y hospedaje estático sencillos y un modelo directo de consumo de API, pero no se eligió porque no incluye SSR ni optimización integral de la landing y desplaza más carga inicial al navegador.
- **React Router en modo framework con TypeScript** — proporciona SSR, loaders y acciones sobre estándares web, pero no se eligió por su menor alineación con el stack tentativo del PRD, el despliegue propuesto en Vercel y la experiencia esperada alrededor de Next.js.

## Consecuencias

- La landing puede entregar HTML inicial indexable y las áreas privadas pueden compartir layouts, navegación por rol y límites de carga coherentes.
- La optimización integrada de imágenes ayuda con las fotografías de solicitudes y el rendimiento móvil, pero debe configurarse para aceptar únicamente los orígenes del almacenamiento seleccionado.
- El equipo deberá gestionar correctamente las fronteras entre componentes de servidor y cliente, además de las reglas de caché y revalidación de Next.js.
- Existirán dos capas con capacidad de ejecutar código de servidor, Next.js y la API, por lo que se requiere disciplina para no duplicar autorización ni lógica del dominio.
