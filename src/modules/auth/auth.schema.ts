import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const SetPasswordSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  nik: z
    .string()
    .length(16, "NIK harus tepat 16 digit")
    .regex(/^\d+$/, "NIK harus angka"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72, "Password maksimal 72 karakter"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SetPasswordInput = z.infer<typeof SetPasswordSchema>;
