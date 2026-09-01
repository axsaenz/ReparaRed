# ADR 0005: NestJS con Fastify para la API

## Estado

Aceptado

## Contexto

La API debe publicar el contrato OpenAPI, validar tokens y datos de entrada, aplicar autorización por rol y propiedad, controlar transiciones de estado y ejecutar de forma transaccional la selección de una cotización. El equipo tiene mayor experiencia con TypeScript y Node.js, y la aplicación web también se implementará con TypeScript.

## Decisión

La API se implementará con una versión estable y soportada de Node.js, TypeScript y NestJS usando el adaptador Fastify. Se organizará en módulos por capacidad de negocio, como identidad y perfiles, solicitudes, cotizaciones, servicios, reseñas y almacenamiento. Los controladores adaptarán HTTP al dominio; los servicios de aplicación coordinarán reglas y transacciones; y guards o policies centralizarán autenticación y autorización.

NestJS generará y publicará el contrato OpenAPI acordado. Fastify será el servidor HTTP para mantener una capa de transporte eficiente sin abandonar la estructura modular de NestJS.

## Alternativas consideradas

- **Fastify con TypeScript sin NestJS** — reduce abstracciones y boilerplate y permite una API liviana, pero no se eligió porque obliga al equipo a diseñar y mantener manualmente límites modulares, inyección de dependencias y patrones uniformes de autorización para un dominio con varias reglas relacionadas.
- **FastAPI con Python** — ofrece validación concisa y generación OpenAPI madura, pero no se eligió porque introduce un segundo lenguaje, divide el tooling del monorepo y no aprovecha la experiencia principal del equipo en TypeScript y Node.js.

## Consecuencias

- Web y API compartirán lenguaje, configuración de calidad y conocimientos, aunque no compartirán modelos del dominio de forma que el contrato OpenAPI deje de ser la frontera explícita.
- La estructura de módulos, guards y servicios facilita probar reglas de autorización y transiciones fuera de los controladores.
- NestJS añade decoradores, convenciones y código estructural que puede sentirse pesado para endpoints simples.
- El adaptador Fastify exige verificar la compatibilidad de librerías y ejemplos del ecosistema NestJS que asumen Express.
