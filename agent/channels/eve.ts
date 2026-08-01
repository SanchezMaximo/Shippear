import { eveChannel } from "eve/channels/eve";
import { localDev, none, vercelOidc } from "eve/channels/auth";

/**
 * ⚠️ DEMO PÚBLICA: `none()` acepta tráfico anónimo.
 *
 * Cualquiera con la URL del deploy puede conversar con Kigent, consultar la API
 * de KiteProp y aprobar `send_proposal_email`, que manda mails reales vía Resend
 * con tu API key. El costo y el envío corren por tu cuenta.
 *
 * Antes de que esto deje de ser una demo, reemplazá `none()` por el auth de tu
 * app (Auth.js, Clerk) o por `httpBasic()` si alcanza con usuario y contraseña
 * compartidos entre los asesores. La lista se recorre en orden: poné tu
 * autenticador primero y borrá `none()`, que al ser el último acepta todo lo que
 * no reconocieron los anteriores.
 */
export default eveChannel({
  auth: [
    // Deja que la TUI de eve y tus deployments de Vercel lleguen al agente.
    vercelOidc(),
    // Abre localhost para `eve dev` y el REPL; se ignora en producción.
    localDev(),
    // Acceso anónimo explícito. Ver la advertencia de arriba.
    none(),
  ],
});
