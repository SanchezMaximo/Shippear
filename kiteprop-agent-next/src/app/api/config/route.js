export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ agencyName: process.env.AGENCY_NAME || "Mi Inmobiliaria" });
}
