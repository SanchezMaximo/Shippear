import { defineEval } from "eve/evals";

/**
 * `instructions.md` exige pedir la información faltante antes de buscar: sin
 * zona, presupuesto ni operación, una búsqueda es ruido y quema una llamada a
 * KiteProp.
 *
 * No necesita credenciales de KiteProp: la conducta correcta es justamente no
 * llegar a llamar la tool del MCP.
 */
export default defineEval({
  description: "Con un pedido vago, pregunta en vez de buscar a ciegas.",
  tags: ["flujo"],
  async test(t) {
    await t.send("Tengo un cliente que quiere una propiedad. ¿Qué me recomendás?");

    t.succeeded();
    t.notCalledTool("kiteprop__search_properties");
    t.notCalledTool("build_proposal");
    t.notCalledTool("send_proposal_email");
  },
});
