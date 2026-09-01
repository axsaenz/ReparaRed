# Revisión adversarial — ReparaRed

**Alcance:** `TECH-DESIGN.md`, los 20 ADRs (`adrs/0001`–`adrs/0020`), `PRD.md` y `Design.md`.
**Método:** revisión en conversación nueva, sin el historial de generación del diseño; cada ADR se intentó refutar antes de darlo por válido.

## Crítico

Ninguno. Se intentó encontrar decisiones que rompan un flujo o contradigan un requisito explícito; los puntos de integridad (selección atómica, concurrencia, privacidad de contacto e imágenes) están bien resueltos.

## Advertencia

### 1. El TDD afirma que no existe `Design.md`, pero existe

- **Objetivo:** `TECH-DESIGN.md` cabecera ("Design.md disponible: No") y §15.1 ("No existe Design.md"); también el contexto de ADR-0002.
- **Problema:** `Design.md` sí existe en el repositorio. Es solo un sistema visual (colores/tipografía) sin elementos de datos, por lo que el modelo de datos no queda desmentido — pero la premisa del documento es falsa y la cláusula de riesgo §15.1 queda desactivada: si llega un prototipo de Stitch con campos nuevos, el documento dice que no hay nada que contrastar.
- **Por qué importa:** la gestión de riesgo del diseño se apoya en una afirmación incorrecta; debe corregirse la referencia y re-ejecutar el cotejo contra `Design.md`.

### 2. El bootstrap de `users` y la elección de rol no tienen contrato

- **Objetivo:** §8.1 (sesión/onboarding) y §7.2 (superficie de API).
- **Problema:** §8.1 dice que la API crea `users` "con el rol elegido una sola vez", pero §7.2 no lista ningún endpoint de onboarding/registro de rol, ni cómo llega el rol a la API (¿body? ¿user_metadata del token?), ni qué responde la API cuando el token es válido pero `users` aún no existe (p. ej. `GET /me/profile` antes del onboarding).
- **Por qué importa:** HU-01 y los criterios 14.1/14.2 dependen de esto; el contrato actual no puede implementarse sin inventar una ruta y una semántica que el diseño no define.

### 3. La carga de imágenes no restringe nada durante la subida, y no hay límites de uso definidos

- **Objetivo:** ADR-0012, §9 (Fotografías), §7.1.
- **Problema:** la reserva declara tamaño/tipo, pero la URL firmada de carga de Supabase no impone esos límites; la verificación real ocurre recién en `confirm`. Entre la subida y la limpieza, un cliente puede depositar objetos de hasta el límite del bucket (muy superior a 5 MiB) con contenido arbitrario. Agrava esto que §7.1 reserva `429` pero ninguna sección ni ADR define rate limiting o cuotas (borradores ilimitados por cliente, reservas ilimitadas).
- **Por qué importa:** vector real de costo/abuso sobre un bucket que además guarda fotografías privadas.

### 4. Consecuencia no considerada de combinar ADR-0012 + ADR-0004: las URLs firmadas rompen la optimización de imágenes

- **Objetivo:** ADR-0012, ADR-0004, §9 y el NFR de rendimiento del PRD.
- **Problema:** el detalle de una solicitud devuelve URLs firmadas recién generadas en cada fetch; Next.js Image cachea por URL completa, así que el caché de optimización se invalida en cada render y el origen se re-descarga/re-procesa por usuario. Además, el NFR del PRD exige "optimización de imágenes" y ninguna sección decide cómo se optimiza la *entrega* (transformaciones de Supabase, tamaños, `next/image` con clave estable). §9 solo cubre restricción de tamaño de subida, que es otra cosa.
- **Por qué importa:** costo y latencia de entrega de imágenes en un producto mobile-first; es el choque de dos decisiones aceptadas que ningún ADR menciona.

## Sugerencia

### 1. Exigir ≥1 imagen para publicar excede el PRD

- **Objetivo:** ADR-0019 y §6.1.
- **Problema:** el PRD §6 dice "hasta tres fotografías" (0–3); el diseño impone mínimo 1 sin justificación en el PRD.
- **Acción:** si es intencional, documentarlo como decisión; si no, relajar la validación.

### 2. Inconsistencia de normalización en `reviews`

- **Objetivo:** ADR-0002 vs §5.1.
- **Problema:** ADR-0002 dice que la reseña queda "vinculada al cliente y técnico participantes", pero §5.1 almacena `clientId` y no `technicianId`. O se guardan ambos o ninguno: hoy se denormaliza el cliente y el técnico se resuelve con dos saltos (`review → service → quote`) para calcular el promedio, justo la consulta más frecuente de reputación.

### 3. ADR-0014 omite la asimetría inversa

- **Objetivo:** ADR-0014 (consecuencias).
- **Problema:** las consecuencias mencionan el daño cuando el *técnico* cancela, pero no el caso opuesto: el cliente puede cancelar desde `AWAITING_CONFIRMATION` con el trabajo ya ejecutado, dejando al técnico sin confirmación ni reseña y sin mecanismo de disputa. Es la consecuencia directa más delicada de la decisión y merece una línea explícita, aunque las disputas queden fuera de alcance.

### 4. Decisiones operativas anunciadas pero no tomadas

- **Objetivo:** ADR-0001, §5.1, §12.2.
- **Problema:** ADR-0001 admite como costo "herramientas y automatización de monorepo" sin elegir ninguna (¿pnpm/npm workspaces, Turborepo?); §5.1 promete seeds idempotentes de distritos y categorías pero el pipeline §12.2 no tiene paso de seed (un entorno nuevo se despliega sin catálogos); la plataforma de CI queda sin nombrar.

### 5. La condición de regiones cercanas (ADR-0008) puede no ser satisfacible

- **Objetivo:** ADR-0008, §12.3, ADR-0011.
- **Problema:** el diseño exige cercanía geográfica entre web, API, base y Storage para un público en Lima, pero no verifica que Railway ofrezca una región próxima a la elección de Supabase. Cada operación privada además cruza dos saltos (navegador → Vercel → Railway, costo ya admitido por ADR-0011).
- **Acción:** validar la disponibilidad real de regiones antes de comprometer el despliegue, o el requisito queda como letra muerta.

## Áreas que resistieron el escrutinio

Se intentó refutar y no se encontró problema real en: ADR-0015 (bloqueos de fila), ADR-0010 (resiliencia síncrona sin colas), ADR-0013 (`AWAITING_CONFIRMATION`), ADR-0020 (contacto visible tras selección), ADR-0016/0017/0018 (dinero, zonas horarias, distritos) y ADR-0003/0005/0006/0007/0009/0011 (contrato, stack, persistencia, estado remoto y BFF): sus alternativas son genuinas y sus consecuencias incluyen costos reales. La matriz de acceso §8.2 y los criterios de aceptación §14 cubren los flujos del PRD sin contradicciones, salvo la observación del mínimo de imágenes.
