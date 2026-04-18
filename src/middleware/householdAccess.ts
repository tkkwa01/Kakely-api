import { createMiddleware } from "hono/factory";
import { db } from "../lib/firebase.js";
import { NotFoundError, ForbiddenError } from "../lib/errors.js";
import type { HouseholdDoc } from "../types/firestore.types.js";
import type { HouseholdVariables } from "../types/hono.types.js";

export const householdAccess = createMiddleware<{
  Variables: HouseholdVariables;
}>(async (c, next) => {
  const householdId = c.req.param("householdId") ?? "";
  const userId = c.get("userId");

  const snap = await db.collection("households").doc(householdId).get();
  if (!snap.exists) throw new NotFoundError("Household not found");

  const data = snap.data() as HouseholdDoc;
  if (!data.memberIds.includes(userId)) {
    throw new ForbiddenError("Not a member of this household");
  }

  c.set("householdId", householdId);
  c.set("household", { id: householdId, ...data });
  await next();
});
