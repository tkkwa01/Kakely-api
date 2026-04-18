import { Timestamp } from "firebase-admin/firestore";
import { db } from "../lib/firebase.js";
import type { TransactionDoc, CategoryDoc } from "../types/firestore.types.js";

export async function getMonthlyReport(
  householdId: string,
  year: number,
  month: number
): Promise<unknown> {
  const start = Timestamp.fromDate(new Date(year, month - 1, 1));
  const end = Timestamp.fromDate(new Date(year, month, 1));

  const [txSnap, catSnap] = await Promise.all([
    db
      .collection("households")
      .doc(householdId)
      .collection("transactions")
      .where("date", ">=", start)
      .where("date", "<", end)
      .get(),
    db
      .collection("households")
      .doc(householdId)
      .collection("categories")
      .get(),
  ]);

  const categories = new Map(
    catSnap.docs.map((d) => [d.id, d.data() as CategoryDoc])
  );

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = new Map<string, number>();
  const categoryCount = new Map<string, number>();

  for (const doc of txSnap.docs) {
    const tx = doc.data() as TransactionDoc;
    if (tx.type === "income") totalIncome += tx.amount;
    else totalExpense += tx.amount;

    categoryTotals.set(tx.categoryId, (categoryTotals.get(tx.categoryId) ?? 0) + tx.amount);
    categoryCount.set(tx.categoryId, (categoryCount.get(tx.categoryId) ?? 0) + 1);
  }

  const byCategory = Array.from(categoryTotals.entries())
    .map(([categoryId, total]) => {
      const cat = categories.get(categoryId);
      const totalForType = cat?.type === "income" ? totalIncome : totalExpense;
      return {
        categoryId,
        categoryName: cat?.name ?? "Unknown",
        type: cat?.type ?? "expense",
        color: cat?.color ?? "#888888",
        total,
        percentage: totalForType > 0 ? Math.round((total / totalForType) * 1000) / 10 : 0,
        transactionCount: categoryCount.get(categoryId) ?? 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    year,
    month,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    byCategory,
  };
}

export async function getTrend(
  householdId: string,
  months: number
): Promise<unknown> {
  const now = new Date();
  const results: unknown[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const start = Timestamp.fromDate(new Date(year, month - 1, 1));
    const end = Timestamp.fromDate(new Date(year, month, 1));

    const snaps = await db
      .collection("households")
      .doc(householdId)
      .collection("transactions")
      .where("date", ">=", start)
      .where("date", "<", end)
      .get();

    let totalIncome = 0;
    let totalExpense = 0;
    for (const doc of snaps.docs) {
      const tx = doc.data() as TransactionDoc;
      if (tx.type === "income") totalIncome += tx.amount;
      else totalExpense += tx.amount;
    }

    results.push({ year, month, totalIncome, totalExpense });
  }

  return { months: results };
}
