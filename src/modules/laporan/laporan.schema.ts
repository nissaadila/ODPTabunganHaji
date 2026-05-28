import { z } from "zod";

export const LaporanQuerySchema = z.object({
  bulan: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format bulan harus YYYY-MM (contoh: 2026-05)"),
});

export type LaporanQueryInput = z.infer<typeof LaporanQuerySchema>;
