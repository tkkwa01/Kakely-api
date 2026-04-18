import { Hono } from "hono";
import authRoutes from "./auth.routes.js";
import householdsRoutes from "./households.routes.js";
import categoriesRoutes from "./categories.routes.js";
import transactionsRoutes from "./transactions.routes.js";
import reportsRoutes from "./reports.routes.js";

const api = new Hono();

api.route("/auth", authRoutes);
api.route("/households", householdsRoutes);
api.route("/households/:householdId/categories", categoriesRoutes);
api.route("/households/:householdId/transactions", transactionsRoutes);
api.route("/households/:householdId/reports", reportsRoutes);

export default api;
