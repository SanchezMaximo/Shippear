import { defineEvalConfig } from "eve/evals";

/**
 * Todos los evals de Kigent son deterministas (aserciones sobre qué tools se
 * llamaron y en qué orden), así que no hace falta configurar un modelo `judge`.
 * Agregalo acá si más adelante sumás aserciones `t.judge.*` para evaluar la
 * calidad de la redacción de las propuestas.
 */
export default defineEvalConfig({});
