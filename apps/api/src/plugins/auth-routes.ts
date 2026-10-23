import type { Auth } from "@mailnitio/auth";
import type { FastifyInstance } from "fastify";

/** Mount Better Auth under /api/auth/* by translating Fastify requests to Fetch requests. */
export function registerAuthRoutes(app: FastifyInstance, auth: Auth, publicUrl: string) {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    async handler(request, reply) {
      const url = new URL(request.url, publicUrl);
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (value === undefined) continue;
        headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
      }
      const fetchRequest = new Request(url, {
        method: request.method,
        headers,
        body:
          request.method === "GET" || request.body === undefined ? undefined : JSON.stringify(request.body),
      });
      const response = await auth.handler(fetchRequest);

      reply.status(response.status);
      for (const [key, value] of response.headers) {
        if (key.toLowerCase() === "set-cookie") continue;
        reply.header(key, value);
      }
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) reply.header("set-cookie", cookies);
      return reply.send(response.body ? await response.text() : null);
    },
  });
}
