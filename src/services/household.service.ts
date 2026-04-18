import { FieldValue } from "firebase-admin/firestore";
import { db } from "../lib/firebase.js";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../lib/errors.js";
import type { HouseholdDoc, MemberDoc } from "../types/firestore.types.js";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function toDate(ts: FirebaseFirestore.Timestamp | undefined): string {
  return ts ? ts.toDate().toISOString() : new Date().toISOString();
}

export async function createHousehold(
  ownerId: string,
  name: string
): Promise<Record<string, unknown>> {
  const now = FieldValue.serverTimestamp();
  const inviteCode = generateInviteCode();

  const householdRef = db.collection("households").doc();
  const memberRef = householdRef.collection("members").doc(ownerId);

  const ownerSnap = await db.collection("users").doc(ownerId).get();
  const ownerData = ownerSnap.data() ?? {};

  const batch = db.batch();
  batch.set(householdRef, {
    name,
    ownerId,
    memberIds: [ownerId],
    inviteCode,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(memberRef, {
    userId: ownerId,
    displayName: ownerData["displayName"] ?? "",
    photoURL: ownerData["photoURL"] ?? null,
    role: "owner",
    joinedAt: now,
  });
  await batch.commit();

  const snap = await householdRef.get();
  const data = snap.data() as HouseholdDoc;
  return {
    householdId: householdRef.id,
    name: data.name,
    ownerId: data.ownerId,
    memberIds: data.memberIds,
    inviteCode: data.inviteCode,
    createdAt: toDate(data.createdAt as FirebaseFirestore.Timestamp),
  };
}

export async function listHouseholds(userId: string): Promise<unknown[]> {
  const snaps = await db
    .collection("households")
    .where("memberIds", "array-contains", userId)
    .get();

  return snaps.docs.map((d) => {
    const data = d.data() as HouseholdDoc;
    return {
      householdId: d.id,
      name: data.name,
      ownerId: data.ownerId,
      memberIds: data.memberIds,
      inviteCode: data.inviteCode,
      createdAt: toDate(data.createdAt as FirebaseFirestore.Timestamp),
    };
  });
}

export async function getHousehold(
  householdId: string
): Promise<Record<string, unknown>> {
  const snap = await db.collection("households").doc(householdId).get();
  if (!snap.exists) throw new NotFoundError("Household not found");
  const data = snap.data() as HouseholdDoc;

  const membersSnap = await snap.ref.collection("members").get();
  const members = membersSnap.docs.map((d) => {
    const m = d.data() as MemberDoc;
    return {
      userId: m.userId,
      displayName: m.displayName,
      photoURL: m.photoURL,
      role: m.role,
      joinedAt: toDate(m.joinedAt as FirebaseFirestore.Timestamp),
    };
  });

  return {
    householdId,
    name: data.name,
    ownerId: data.ownerId,
    memberIds: data.memberIds,
    inviteCode: data.inviteCode,
    members,
    createdAt: toDate(data.createdAt as FirebaseFirestore.Timestamp),
    updatedAt: toDate(data.updatedAt as FirebaseFirestore.Timestamp),
  };
}

export async function updateHousehold(
  householdId: string,
  requesterId: string,
  updates: { name?: string }
): Promise<Record<string, unknown>> {
  const snap = await db.collection("households").doc(householdId).get();
  if (!snap.exists) throw new NotFoundError();
  const data = snap.data() as HouseholdDoc;
  if (data.ownerId !== requesterId) throw new ForbiddenError("Owner only");

  await snap.ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() });
  return getHousehold(householdId);
}

export async function deleteHousehold(
  householdId: string,
  requesterId: string
): Promise<void> {
  const snap = await db.collection("households").doc(householdId).get();
  if (!snap.exists) throw new NotFoundError();
  const data = snap.data() as HouseholdDoc;
  if (data.ownerId !== requesterId) throw new ForbiddenError("Owner only");
  await snap.ref.delete();
}

export async function joinHousehold(
  householdId: string,
  userId: string,
  inviteCode: string
): Promise<void> {
  const snap = await db.collection("households").doc(householdId).get();
  if (!snap.exists) throw new NotFoundError();
  const data = snap.data() as HouseholdDoc;

  if (data.inviteCode !== inviteCode)
    throw new BadRequestError("Invalid invite code");
  if (data.memberIds.includes(userId))
    throw new BadRequestError("Already a member");

  const userSnap = await db.collection("users").doc(userId).get();
  const userData = userSnap.data() ?? {};

  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.update(snap.ref, {
    memberIds: FieldValue.arrayUnion(userId),
    updatedAt: now,
  });
  batch.set(snap.ref.collection("members").doc(userId), {
    userId,
    displayName: userData["displayName"] ?? "",
    photoURL: userData["photoURL"] ?? null,
    role: "member",
    joinedAt: now,
  });
  await batch.commit();
}

export async function leaveHousehold(
  householdId: string,
  userId: string
): Promise<void> {
  const snap = await db.collection("households").doc(householdId).get();
  if (!snap.exists) throw new NotFoundError();
  const data = snap.data() as HouseholdDoc;

  if (data.ownerId === userId)
    throw new BadRequestError("Owner cannot leave — delete the household instead");

  const batch = db.batch();
  batch.update(snap.ref, {
    memberIds: FieldValue.arrayRemove(userId),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.delete(snap.ref.collection("members").doc(userId));
  await batch.commit();
}

export async function removeMember(
  householdId: string,
  requesterId: string,
  targetUserId: string
): Promise<void> {
  const snap = await db.collection("households").doc(householdId).get();
  if (!snap.exists) throw new NotFoundError();
  const data = snap.data() as HouseholdDoc;

  if (data.ownerId !== requesterId) throw new ForbiddenError("Owner only");
  if (targetUserId === requesterId)
    throw new BadRequestError("Cannot remove yourself");

  const batch = db.batch();
  batch.update(snap.ref, {
    memberIds: FieldValue.arrayRemove(targetUserId),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.delete(snap.ref.collection("members").doc(targetUserId));
  await batch.commit();
}

export async function refreshInviteCode(
  householdId: string,
  requesterId: string
): Promise<string> {
  const snap = await db.collection("households").doc(householdId).get();
  if (!snap.exists) throw new NotFoundError();
  const data = snap.data() as HouseholdDoc;
  if (data.ownerId !== requesterId) throw new ForbiddenError("Owner only");

  const newCode = generateInviteCode();
  await snap.ref.update({ inviteCode: newCode, updatedAt: FieldValue.serverTimestamp() });
  return newCode;
}
