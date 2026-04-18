import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth.js";
import { householdAccess } from "../middleware/householdAccess.js";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  ReorderCategoriesSchema,
} from "../schemas/category.schema.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "../services/category.service.js";
import type { HouseholdVariables } from "../types/hono.types.js";

const app = new Hono<{ Variables: HouseholdVariables }>();

app.use("*", authMiddleware, householdAccess);

app.get("/", async (c) => {
  const type = c.req.query("type") as "income" | "expense" | undefined;
  const categories = await listCategories(c.get("householdId"), type);
  return c.json({ categories });
});

app.post("/", zValidator("json", CreateCategorySchema), async (c) => {
  const input = c.req.valid("json");
  const category = await createCategory(
    c.get("householdId"),
    c.get("userId"),
    input
  );
  return c.json(category, 201);
});

app.patch(
  "/reorder",
  zValidator("json", ReorderCategoriesSchema),
  async (c) => {
    const { orders } = c.req.valid("json");
    await reorderCategories(c.get("householdId"), orders);
    return c.json({ ok: true });
  }
);

app.patch("/:categoryId", zValidator("json", UpdateCategorySchema), async (c) => {
  const updates = c.req.valid("json");
  const category = await updateCategory(
    c.get("householdId"),
    c.req.param("categoryId") ?? "",
    updates
  );
  return c.json(category);
});

app.delete("/:categoryId", async (c) => {
  await deleteCategory(
    c.get("householdId"),
    c.req.param("categoryId") ?? ""
  );
  return c.json({ ok: true });
});

export default app;
