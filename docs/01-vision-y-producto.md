# 01 — Visión y Producto: Riwi Lead Trace

## 1. Definición del Producto (Executive Summary)

**Riwi Lead Trace** es una plataforma web orientada al levantamiento asíncrono de feedback ascendente (Bottom-Up Feedback). Proporciona a los desarrolladores (Coders) un canal formal, estructurado y provisto de anonimato criptográfico para evaluar el desempeño de sus líderes (Team Leaders y Tutores). El núcleo del sistema procesa estas interacciones para calcular el **Índice de Calidad Percibida (ICP)** y delega la síntesis cualitativa a un modelo LLM (Inteligencia Artificial), suministrando a la administración telemetría accionable para la toma de decisiones.

## 2. Visión del Producto (Product Vision)

- **Para** la administración del ecosistema Riwi.
- **Que** carece de un mecanismo formal y estructurado para cuantificar la calidad del acompañamiento técnico y humano.
- **Riwi Lead Trace es** una plataforma web transaccional y analítica.
- **Que** permite habilitar evaluaciones ascendentes con protección de identidad y procesamiento algorítmico del feedback.
- **A diferencia de** los canales informales y carentes de métricas agregadas actuales.
- **Nuestro producto** entrega un panel de control basado en el Índice de Calidad Percibida (ICP) y resúmenes ejecutivos asistidos por IA, catalizando una gestión basada en datos (Data-Driven Management).

## 3. Objetivo Estratégico (Product Goal)

Validar, mediante el despliegue de un Producto Mínimo Viable (MVP), la hipótesis de que un proceso formal de evaluación estructurada mejora sustancialmente la visibilidad del desempeño de los mentores, entregando artefactos de información accionable a los *stakeholders* correspondientes.

## 4. Objetivos de Negocio

1. **Canal Formal y Seguro:** Establecer una vía de comunicación asíncrona garantizando el anonimato estructural (desacoplamiento a nivel de base de datos).
2. **Métrica Cuantitativa:** Implementar el cálculo del **ICP**, una métrica ponderada de 0 a 100 con mitigación de sesgos estadísticos.
3. **Trazabilidad Histórica:** Preservar la inmutabilidad de los datos de evaluación a través de múltiples ciclos (periodos) operativos.
4. **Data Analytics:** Facilitar la toma de decisiones de la gerencia mediante procesamiento analítico y de lenguaje natural (NLP).
5. **Mejora Continua:** Institucionalizar ciclos iterativos de retroalimentación en la matriz de aprendizaje.

## 5. Métricas de Éxito (KPIs del MVP)

| Métrica | Indicador Telemétrico | Meta MVP |
|---------|-----------------------|----------|
| **Adopción** | Porcentaje de Coders con participación activa registrada. | ≥ 60% |
| **Cobertura** | Porcentaje de Team Leaders/Tutores evaluados exitosamente. | ≥ 70% |
| **Completitud** | Tasa de conversión: Evaluaciones Iniciadas vs. Enviadas. | ≥ 80% |
| **Calidad de Dato** | Proporción de evaluaciones con retroalimentación en texto libre. | ≥ 40% |
| **Viabilidad Analítica**| Porcentaje de líderes superando el umbral de representatividad estadística para el ICP. | ≥ 70% |
| **Retención Admin** | Frecuencia de acceso concurrente al Dashboard por los responsables. | ≥ 1 sesión/semana |
| **Confianza** | Proporción de tráfico direccionado bajo modalidad anónima. | Línea base |

## 6. Propuesta de Valor Diferenciada

- **Coders:** Garantía de anonimato y voz formal sin repercusiones.
- **Team Leaders & Tutores:** Retroalimentación empírica y accionable orientada al crecimiento técnico y humano.
- **Administración:** Reducción del esfuerzo cognitivo mediante síntesis LLM (Google Gemini) e indicadores agregados (ICP).
- **Stakeholders:** Visibilidad transparente y estandarizada sobre la calidad académica.

## 7. Supuestos y Restricciones Técnicas

- **Alcance Operativo:** MVP desarrollado en un ciclo de 4 semanas bajo metodología Scrum estricta y control de versiones (GitFlow).
- **Arquitectura de Software:** Solución Full-Stack. SPA en **Vanilla JS + Vite**, consumiendo una API RESTful construida en **FastAPI (Python)**, respaldada por un motor relacional **MySQL** (3FN).
- **Core Lógico:** Exigencia de no ser un sistema transaccional básico (CRUD); se requiere inyección de lógica de dominio estricta (anonimato, concurrencia, métricas algebraicas derivadas).
