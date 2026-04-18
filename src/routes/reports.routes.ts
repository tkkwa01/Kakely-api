import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth.js";
import { householdAccess } from "../middleware/householdAccess.js";
import { getMonthlyReport, getTrend } from "../services/report.service.js";
import type { HouseholdVariables } from "../types/hono.types.js";

const MonthlyQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const TrendQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

const app = new Hono<{ Variables: HouseholdVariables }>();

app.use("*", authMiddleware, householdAccess);

app.get("/monthly", zValidator("query", MonthlyQuerySchema), async (c) => {
  const { year, month } = c.req.valid("query");
  const report = await getMonthlyReport(c.get("householdId"), year, month);
  return c.json(report);
});

app.get("/trend", zValidator("query", TrendQuerySchema), async (c) => {
  const { months } = c.req.valid("query");
  const trend = await getTrend(c.get("householdId"), months);
  return c.json(trend);
});

export default app;
