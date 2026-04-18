import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth.js";
import { householdAccess } from "../middleware/householdAccess.js";
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
  TransactionQuerySchema,
} from "../schemas/transaction.schema.js";
import {
  listTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
} from "../services/transaction.service.js";
import type { HouseholdVariables } from "../types/hono.types.js";

const app = new Hono<{ Variables: HouseholdVariables }>();

app.use("*", authMiddleware, householdAccess);

app.get("/", zValidator("query", TransactionQuerySchema), async (c) => {
  const query = c.req.valid("query");
  const result = await listTransactions(c.get("householdId"), query);
  return c.json(result);
});

app.post("/", zValidator("json", CreateTransactionSchema), async (c) => {
  const input = c.req.valid("json");
  const tx = await createTransaction(
    c.get("householdId"),
    c.get("userId"),
    input
  );
  return c.json(tx, 201);
});

app.get("/:transactionId", async (c) => {
  const tx = await getTransaction(
    c.get("householdId"),
    c.req.param("transactionId") ?? ""
  );
  return c.json(tx);
});

app.patch(
  "/:transactionId",
  zValidator("json", UpdateTransactionSchema),
  async (c) => {
    const updates = c.req.valid("json");
    const tx = await updateTransaction(
      c.get("householdId"),
      c.req.param("transactionId") ?? "",
      c.get("householdId"),
      updates
    );
    return c.json(tx);
  }
);

app.delete("/:transactionId", async (c) => {
  await deleteTransaction(
    c.get("householdId"),
    c.req.param("transactionId") ?? ""
  );
  return c.json({ ok: true });
});

export default app;
