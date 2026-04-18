import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth.js";
import { householdAccess } from "../middleware/householdAccess.js";
import {
  CreateHouseholdSchema,
  UpdateHouseholdSchema,
  JoinHouseholdSchema,
} from "../schemas/household.schema.js";
import {
  createHousehold,
  listHouseholds,
  getHousehold,
  updateHousehold,
  deleteHousehold,
  joinHousehold,
  leaveHousehold,
  removeMember,
  refreshInviteCode,
} from "../services/household.service.js";
import type { AuthVariables, HouseholdVariables } from "../types/hono.types.js";

const app = new Hono<{ Variables: AuthVariables }>();

app.use("*", authMiddleware);

app.post("/", zValidator("json", CreateHouseholdSchema), async (c) => {
  const { name } = c.req.valid("json");
  const household = await createHousehold(c.get("userId"), name);
  return c.json(household, 201);
});

app.get("/", async (c) => {
  const households = await listHouseholds(c.get("userId"));
  return c.json({ households });
});

const householdApp = new Hono<{ Variables: HouseholdVariables }>();

householdApp.use("/:householdId/*", householdAccess);

householdApp.get("/:householdId", async (c) => {
  const household = await getHousehold(c.get("householdId"));
  return c.json(household);
});

householdApp.patch(
  "/:householdId",
  zValidator("json", UpdateHouseholdSchema),
  async (c) => {
    const updates = c.req.valid("json");
    const household = await updateHousehold(
      c.get("householdId"),
      c.get("userId"),
      updates
    );
    return c.json(household);
  }
);

householdApp.delete("/:householdId", async (c) => {
  await deleteHousehold(c.get("householdId"), c.get("userId"));
  return c.json({ ok: true });
});

householdApp.post(
  "/:householdId/join",
  zValidator("json", JoinHouseholdSchema),
  async (c) => {
    const { inviteCode } = c.req.valid("json");
    await joinHousehold(c.get("householdId"), c.get("userId"), inviteCode);
    return c.json({ ok: true });
  }
);

householdApp.post("/:householdId/leave", async (c) => {
  await leaveHousehold(c.get("householdId"), c.get("userId"));
  return c.json({ ok: true });
});

householdApp.delete("/:householdId/members/:memberId", async (c) => {
  await removeMember(
    c.get("householdId"),
    c.get("userId"),
    c.req.param("memberId") ?? ""
  );
  return c.json({ ok: true });
});

householdApp.post("/:householdId/invite/refresh", async (c) => {
  const newCode = await refreshInviteCode(c.get("householdId"), c.get("userId"));
  return c.json({ inviteCode: newCode });
});

app.route("/", householdApp);

export default app;
