import { FieldValue } from "firebase-admin/firestore";
import { db, adminAuth } from "../lib/firebase.js";
import { NotFoundError } from "../lib/errors.js";
import type { UserDoc } from "../types/firestore.types.js";

type UserResponse = Omit<UserDoc, "uid"> & { uid: string };

function toResponse(uid: string, data: UserDoc): UserResponse {
  const { uid: _uid, ...rest } = data as UserDoc & { uid?: string };
  return { uid, ...rest };
}

export async function registerUser(
  uid: string,
  email: string,
  displayName: string
): Promise<UserResponse> {
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();

  if (snap.exists) {
    return toResponse(uid, snap.data() as UserDoc);
  }

  const data = {
    email,
    displayName,
    photoURL: null,
    createdAt: FieldValue.serverTimestamp(),
    defaultHouseholdId: null,
  };
  await ref.set(data);
  const created = await ref.get();
  return toResponse(uid, created.data() as UserDoc);
}

export async function getUser(uid: string): Promise<UserResponse> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) throw new NotFoundError("User not found");
  return toResponse(uid, snap.data() as UserDoc);
}

export async function updateUser(
  uid: string,
  updates: { displayName?: string; defaultHouseholdId?: string | null }
): Promise<UserResponse> {
  const ref = db.collection("users").doc(uid);
  await ref.update(updates as Record<string, unknown>);
  if (updates.displayName) {
    await adminAuth.updateUser(uid, { displayName: updates.displayName });
  }
  return getUser(uid);
}
