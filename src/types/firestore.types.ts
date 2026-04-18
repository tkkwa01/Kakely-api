import type { Timestamp } from "firebase-admin/firestore";

export type UserDoc = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  defaultHouseholdId: string | null;
};

export type HouseholdDoc = {
  name: string;
  ownerId: string;
  memberIds: string[];
  inviteCode: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type MemberDoc = {
  userId: string;
  displayName: string;
  photoURL: string | null;
  role: "owner" | "member";
  joinedAt: Timestamp;
};

export type CategoryDoc = {
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
  createdBy: string;
  createdAt: Timestamp;
};

export type TransactionDoc = {
  type: "income" | "expense";
  amount: number;
  categoryId: string;
  categoryName: string;
  memo: string | null;
  date: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
