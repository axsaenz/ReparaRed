# ADR 0018: Catálogo configurable de distritos con cobertura inicial de Lima y Callao

## Estado

Aceptado

## Contexto

El PRD exige distrito tanto en el perfil del cliente como en cada solicitud, pero no define formato ni alcance geográfico. El texto libre produciría variantes y dificultaría validación. El MVP no incluye mapas, geolocalización ni panel administrativo avanzado, por lo que el catálogo debe aportar consistencia sin introducir capacidades geográficas fuera de alcance.

## Decisión

Se añadirá la entidad `districts` con identificador interno, código UBIGEO único, nombre, provincia, departamento y estado activo. `client_profiles` y `requests` referenciarán un distrito activo mediante clave foránea, conservando el distrito de la solicitud independiente de futuros cambios en el perfil.

El seed inicial contendrá los distritos oficiales de Lima Metropolitana y Callao. La API expondrá una lista de distritos activos para formularios. Ampliar cobertura o desactivar una opción será un cambio versionado de datos; desactivar un distrito impedirá nuevas selecciones pero no invalidará registros históricos.

No se almacenarán coordenadas ni polígonos y el catálogo no habilitará mapas o geolocalización.

## Alternativas consideradas

- **Distrito como texto libre** — permite cobertura abierta sin seed, pero no se eligió porque genera ortografías inconsistentes, dificulta validación y puede separar perfil y solicitud con valores equivalentes escritos de forma distinta.
- **Lista fija codificada en la interfaz** — simplifica la primera carga, pero no se eligió porque duplica datos entre web y API y exige desplegar código para ampliar o desactivar distritos.
- **Catálogo nacional completo de Perú** — ofrece cobertura inmediata mediante UBIGEO, pero no se eligió porque agrega datos y pruebas que exceden la cobertura inicial acordada para el MVP.

## Consecuencias

- Perfiles y solicitudes usan referencias consistentes y verificables sin incorporar funciones de mapas.
- La cobertura inicial queda limitada a Lima Metropolitana y Callao y debe comunicarse en la interfaz.
- El proyecto debe mantener un seed oficial, estable e idempotente con códigos UBIGEO.
- No habrá interfaz administrativa para modificar el catálogo en el MVP; los cambios se realizarán mediante datos versionados.
