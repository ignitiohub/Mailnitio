export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    service: "web",
    version: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "dev",
  });
}
