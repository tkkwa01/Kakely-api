import { FieldValue } from "firebase-admin/firestore";
import { db } from "../lib/firebase.js";
import { NotFoundError, BadRequestError } from "../lib/errors.js";
import type { CategoryDoc } from "../types/firestore.types.js";

function toDate(ts: FirebaseFirestore.Timestamp | undefined): string {
  return ts ? ts.toDate().toISOString() : new Date().toISOString();
}

function serialize(id: string, data: CategoryDoc) {
  return {
    categoryId: id,
    name: data.name,
    type: data.type,
    icon: data.icon,
    color: data.color,
    sortOrder: data.sortOrder,
    isDefault: data.isDefault,
    createdBy: data.createdBy,
    createdAt: toDate(data.createdAt as FirebaseFirestore.Timestamp),
  };
}

export async function listCategories(
  householdId: string,
  type?: "income" | "expense"
): Promise<unknown[]> {
  let query = db
    .collection("households")
    .doc(householdId)
    .collection("categories")
    .orderBy("type")
    .orderBy("sortOrder");

  const snaps = await query.get();
  const results = snaps.docs.map((d) => serialize(d.id, d.data() as CategoryDoc));
  return type ? results.filter((c) => (c as { type: string }).type === type) : results;
}

export async function createCategory(
  householdId: string,
  createdBy: string,
  input: {
    name: string;
    type: "income" | "expense";
    icon: string;
    color: string;
    sortOrder: number;
  }
): Promise<unknown> {
  const ref = db
    .collection("households")
    .doc(householdId)
    .collection("categories")
    .doc();

  const data: Omit<CategoryDoc, "createdAt"> & { createdAt: FirebaseFirestore.FieldValue } = {
    ...input,
    isDefault: false,
    createdBy,
    createdAt: FieldValue.serverTimestamp(),
  };
  await ref.set(data);
  const snap = await ref.get();
  return serialize(ref.id, snap.data() as CategoryDoc);
}

export async function updateCategory(
  householdId: string,
  categoryId: string,
  updates: Partial<Pick<CategoryDoc, "name" | "type" | "icon" | "color" | "sortOrder">>
): Promise<unknown> {
  const ref = db
    .collection("households")
    .doc(householdId)
    .collection("categories")
    .doc(categoryId);

  const snap = await ref.get();
  if (!snap.exists) throw new NotFoundError("Category not found");
  await ref.update(updates as Record<string, unknown>);
  const updated = await ref.get();
  return serialize(categoryId, updated.data() as CategoryDoc);
}

export async function deleteCategory(
  householdId: string,
  categoryId: string
): Promise<void> {
  const txSnap = await db
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .where("categoryId", "==", categoryId)
    .limit(1)
    .get();

  if (!txSnap.empty) {
    throw new BadRequestError(
      "Cannot delete category with existing transactions"
    );
  }

  const ref = db
    .collection("households")
    .doc(householdId)
    .collection("categories")
    .doc(categoryId);

  const snap = await ref.get();
  if (!snap.exists) throw new NotFoundError("Category not found");
  await ref.delete();
}

export async function reorderCategories(
  householdId: string,
  orders: { categoryId: string; sortOrder: number }[]
): Promise<void> {
  const batch = db.batch();
  const base = db
    .collection("households")
    .doc(householdId)
    .collection("categories");

  for (const { categoryId, sortOrder } of orders) {
    batch.update(base.doc(categoryId), { sortOrder });
  }
  await batch.commit();
}
