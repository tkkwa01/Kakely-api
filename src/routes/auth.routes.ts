import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth.js";
import { RegisterSchema, UpdateUserSchema } from "../schemas/auth.schema.js";
import { registerUser, getUser, updateUser } from "../services/user.service.js";
import type { AuthVariables } from "../types/hono.types.js";

const app = new Hono<{ Variables: AuthVariables }>();

app.post("/register", authMiddleware, zValidator("json", RegisterSchema), async (c) => {
  const userId = c.get("userId");
  const userEmail = c.get("userEmail");
  const { displayName } = c.req.valid("json");
  const user = await registerUser(userId, userEmail, displayName);
  return c.json(user, 200);
});

app.get("/me", authMiddleware, async (c) => {
  const user = await getUser(c.get("userId"));
  return c.json(user);
});

app.patch("/me", authMiddleware, zValidator("json", UpdateUserSchema), async (c) => {
  const updates = c.req.valid("json");
  const user = await updateUser(c.get("userId"), updates);
  return c.json(user);
});

export default app;
