import { z } from "zod";

export const shopProfileSchema = z.object({
  name: z.string().min(2, "Shop name is too short"),
  ownerPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gstin: z.string().optional().nullable()
});

export const profileSchema = z.object({
  name: z.string().min(2, "Your name is too short"),
  phone: z.string().optional().nullable()
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters")
});

export const inviteTeamMemberSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["manager", "cashier", "staff"])
});

export const updateTeamMemberSchema = z.object({
  role: z.enum(["manager", "cashier", "staff"]).optional(),
  isActive: z.boolean().optional()
});
