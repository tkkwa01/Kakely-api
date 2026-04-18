import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../lib/firebase.js";
import { NotFoundError, BadRequestError } from "../lib/errors.js";
import type { TransactionDoc, CategoryDoc } from "../types/firestore.types.js";

function toDateStr(ts: FirebaseFirestore.Timestamp): string {
  return ts.toDate().toISOString().split("T")[0] ?? "";
}

function toISO(ts: FirebaseFirestore.Timestamp | undefined): string {
  return ts ? ts.toDate().toISOString() : new Date().toISOString();
}

function serialize(id: string, data: TransactionDoc) {
  return {
    transactionId: id,
    type: data.type,
    amount: data.amount,
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    memo: data.memo,
    date: toDateStr(data.date as FirebaseFirestore.Timestamp),
    createdBy: data.createdBy,
    createdAt: toISO(data.createdAt as FirebaseFirestore.Timestamp),
    updatedAt: toISO(data.updatedAt as FirebaseFirestore.Timestamp),
  };
}

export async function listTransactions(
  householdId: string,
  query: {
    year: number;
    month: number;
    type?: "income" | "expense";
    categoryId?: string;
    limit: number;
    startAfter?: string;
  }
): Promise<{ transactions: unknown[]; nextCursor: string | null }> {
  const start = Timestamp.fromDate(new Date(query.year, query.month - 1, 1));
  const end = Timestamp.fromDate(new Date(query.year, query.month, 1));

  let q = db
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .where("date", ">=", start)
    .where("date", "<", end)
    .orderBy("date", "desc")
    .limit(query.limit + 1);

  if (query.type) q = q.where("type", "==", query.type) as typeof q;
  if (query.categoryId) q = q.where("categoryId", "==", query.categoryId) as typeof q;

  if (query.startAfter) {
    const cursorDoc = await db
      .collection("households")
      .doc(householdId)
      .collection("transactions")
      .doc(query.startAfter)
      .get();
    if (cursorDoc.exists) q = q.startAfter(cursorDoc) as typeof q;
  }

  const snaps = await q.get();
  const hasMore = snaps.docs.length > query.limit;
  const docs = hasMore ? snaps.docs.slice(0, query.limit) : snaps.docs;

  return {
    transactions: docs.map((d) => serialize(d.id, d.data() as TransactionDoc)),
    nextCursor: hasMore ? (docs[docs.length - 1]?.id ?? null) : null,
  };
}

export async function createTransaction(
  householdId: string,
  createdBy: string,
  input: {
    type: "income" | "expense";
    amount: number;
    categoryId: string;
    memo?: string | null;
    date: string;
  }
): Promise<unknown> {
  const categorySnap = await db
    .collection("households")
    .doc(householdId)
    .collection("categories")
    .doc(input.categoryId)
    .get();

  if (!categorySnap.exists) throw new BadRequestError("Category not found");
  const categoryData = categorySnap.data() as CategoryDoc;

  const [year, month, day] = input.date.split("-").map(Number);
  const dateTs = Timestamp.fromDate(new Date(year!, month! - 1, day!));
  const now = FieldValue.serverTimestamp();

  const ref = db
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .doc();

  await ref.set({
    type: input.type,
    amount: input.amount,
    categoryId: input.categoryId,
    categoryName: categoryData.name,
    memo: input.memo ?? null,
    date: dateTs,
    createdBy,
    createdAt: now,
    updatedAt: now,
  });

  const snap = await ref.get();
  return serialize(ref.id, snap.data() as TransactionDoc);
}

export async function getTransaction(
  householdId: string,
  transactionId: string
): Promise<unknown> {
  const snap = await db
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .doc(transactionId)
    .get();

  if (!snap.exists) throw new NotFoundError("Transaction not found");
  return serialize(transactionId, snap.data() as TransactionDoc);
}

export async function updateTransaction(
  householdId: string,
  transactionId: string,
  householdRef: string,
  updates: {
    type?: "income" | "expense";
    amount?: number;
    categoryId?: string;
    memo?: string | null;
    date?: string;
  }
): Promise<unknown> {
  const ref = db
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .doc(transactionId);

  const snap = await ref.get();
  if (!snap.exists) throw new NotFoundError("Transaction not found");

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (updates.amount !== undefined) patch["amount"] = updates.amount;
  if (updates.type !== undefined) patch["type"] = updates.type;
  if (updates.memo !== undefined) patch["memo"] = updates.memo;
  if (updates.date !== undefined) {
    const [year, month, day] = updates.date.split("-").map(Number);
    patch["date"] = Timestamp.fromDate(new Date(year!, month! - 1, day!));
  }
  if (updates.categoryId !== undefined) {
    const catSnap = await db
      .collection("households")
      .doc(householdId)
      .collection("categories")
      .doc(updates.categoryId)
      .get();
    if (!catSnap.exists) throw new BadRequestError("Category not found");
    patch["categoryId"] = updates.categoryId;
    patch["categoryName"] = (catSnap.data() as CategoryDoc).name;
  }

  await ref.update(patch);
  const updated = await ref.get();
  return serialize(transactionId, updated.data() as TransactionDoc);
}

export async function deleteTransaction(
  householdId: string,
  transactionId: string
): Promise<void> {
  const ref = db
    .collection("households")
    .doc(householdId)
    .collection("transactions")
    .doc(transactionId);

  const snap = await ref.get();
  if (!snap.exists) throw new NotFoundError("Transaction not found");
  await ref.delete();
}
