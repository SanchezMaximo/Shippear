export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
    kitepropConfigured: !!process.env.KITEPROP_API_KEY,
  });
}
