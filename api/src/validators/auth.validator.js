import { z } from "zod";

export const signupSchema = z.object({
  shopName: z.string().min(2, "Shop name is too short"),
  name: z.string().min(2, "Your name is too short"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required")
});
