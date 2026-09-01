# ADR 0016: Precios decimales con moneda ISO explícita

## Estado

Aceptado

## Contexto

Las cotizaciones requieren un precio que el cliente pueda comparar, pero el PRD no define moneda ni representación. El MVP no procesará pagos, aunque debe evitar redondeos binarios y respuestas ambiguas entre PostgreSQL, NestJS y JavaScript.

## Decisión

Cada cotización almacenará un monto decimal de precisión fija y un código de moneda ISO 4217. El MVP admitirá únicamente `PEN`, validado tanto por la API como por una restricción de base de datos, y exigirá un monto mayor que cero.

PostgreSQL usará un tipo `NUMERIC` con escala de dos decimales adecuada para el rango definido por el producto. OpenAPI representará el monto como texto decimal y la moneda como enumeración, evitando convertir dinero a un `number` binario durante el transporte. La web formateará ambos con reglas de localización para mostrar y comparar, sin realizar cálculos financieros.

## Alternativas consideradas

- **Monto decimal con PEN implícito global** — reduce una columna y un campo del contrato, pero no se eligió porque la moneda quedaría implícita y sería más difícil interpretar o migrar datos fuera del contexto actual.
- **Unidades menores enteras con moneda ISO** — evita decimales y es habitual en sistemas de pagos, pero no se eligió porque añade conversiones y reglas por moneda que no aportan valor a un MVP sin transacciones monetarias.

## Consecuencias

- Los precios tienen semántica explícita y no sufren pérdida de precisión al cruzar JSON y JavaScript.
- Agregar otra moneda requerirá una decisión de producto sobre comparación y visualización, no solo habilitar otro código.
- Los consumidores del contrato deben tratar el monto como decimal textual y no como `number` nativo.
- La precisión máxima de `NUMERIC` deberá fijarse en el esquema y validarse con un límite de negocio verificable.
