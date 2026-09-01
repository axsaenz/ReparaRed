# ADR 0001: Componentes separados en un monorepo

## Estado

Aceptado

## Contexto

El PRD define una aplicación web responsive responsable de las interfaces, formularios, navegación y consumo de una API. También exige un backend responsable de autenticación, autorización y reglas de negocio, además de persistencia relacional y almacenamiento externo para hasta tres fotografías por solicitud. Como ReparaRed es un MVP greenfield para un proyecto de curso, la arquitectura debe conservar límites claros sin imponer coordinación innecesaria entre repositorios.

## Decisión

ReparaRed se implementará en un monorepo con dos aplicaciones desplegables de forma independiente: una aplicación web y una API. La aplicación web será responsable de presentación, navegación e interacción; la API será la única autoridad para autorización, reglas de negocio y acceso a datos. La base de datos relacional, la autenticación y el almacenamiento de imágenes serán dependencias administradas externas. La comunicación entre la aplicación web y la API se realizará por HTTPS mediante un contrato que se definirá en una ADR posterior.

## Alternativas consideradas

- **Dos repositorios, uno para frontend y otro para API** — ofrece mayor independencia de ciclos, permisos y despliegues, pero no se eligió porque añade coordinación, automatización duplicada y riesgo de desalineación contractual para un equipo pequeño y un MVP.
- **Aplicación full-stack en un único desplegable** — reduce la configuración y la operación inicial, pero no se eligió porque acopla presentación y backend, dificulta conservar la API como límite de autorización y se aparta de la separación explícita planteada por el PRD.

## Consecuencias

- Los cambios coordinados de frontend y API pueden revisarse y versionarse juntos, mientras cada aplicación conserva responsabilidades y despliegue propios.
- El repositorio requerirá herramientas y automatización de monorepo, además de pipelines y configuración diferenciados para dos desplegables.
- La disponibilidad del flujo completo dependerá tanto de ambos desplegables como de los servicios administrados externos.
