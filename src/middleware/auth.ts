import { createMiddleware } from "hono/factory";
import { adminAuth } from "../lib/firebase.js";
import { UnauthorizedError } from "../lib/errors.js";
import type { AuthVariables } from "../types/hono.types.js";

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing Bearer token");
    }
    const token = authHeader.slice(7);
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      c.set("userId", decoded.uid);
      c.set("userEmail", decoded.email ?? "");
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
    await next();
  }
);
