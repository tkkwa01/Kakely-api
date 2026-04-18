import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(30),
  type: z.enum(["income", "expense"]),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sortOrder: z.number().int().min(0),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const ReorderCategoriesSchema = z.object({
  orders: z.array(
    z.object({
      categoryId: z.string(),
      sortOrder: z.number().int().min(0),
    })
  ),
});
