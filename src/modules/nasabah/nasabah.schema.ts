import { z } from "zod";

export const CreateNasabahSchema = z.object({
  nik: z
    .string()
    .length(16, "NIK harus tepat 16 digit")
    .regex(/^\d+$/, "NIK harus angka"),
  nama: z.string().min(3, "Nama minimal 3 karakter").max(100),
  email: z.string().email("Format email tidak valid").max(150),
  nomorHp: z
    .string()
    .regex(/^08\d{8,11}$/, "Nomor HP harus format 08xxxxxxxxxx (10-13 digit)"),
});

export const UpdateNasabahSchema = CreateNasabahSchema.partial();

export const IdParamSchema = z.object({
  id: z.string().uuid("ID harus format UUID"),
});

// Query param GET /nasabah. pageSize di-cap supaya admin tidak bisa dump
// seluruh tabel dalam satu request (mitigasi mass-data exfiltration).
export const ListNasabahQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  page: z
    .coerce.number()
    .int()
    .min(1)
    .default(1),
  pageSize: z
    .coerce.number()
    .int()
    .min(1)
    .max(100, "pageSize maksimal 100")
    .default(20),
});

export type CreateNasabahInput = z.infer<typeof CreateNasabahSchema>;
export type UpdateNasabahInput = z.infer<typeof UpdateNasabahSchema>;
export type ListNasabahQuery = z.infer<typeof ListNasabahQuerySchema>;