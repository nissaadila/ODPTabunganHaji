import { z } from 'zod';

export const OpenTabunganSchema = z.object({
  nasabahId: z.string().uuid("nasabahId harus format UUID"),
});

export const SetorSchema = z.object({
  nominal: z
    .number({ error: "Nominal harus angka" })
    .int("Nominal harus bilangan bulat")
    .min(100_000, "Nominal minimal Rp 100.000"),
});

export const TarikSchema = z.object({
  nominal: z
    .number({ error: "Nominal harus angka" })
    .int("Nominal harus bilangan bulat")
    .positive("Nominal harus lebih dari 0"),
  catatan: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

export const IdParamSchema = z.object({
  id: z.string().uuid("ID harus format UUID"),
});

export type OpenTabunganInput = z.infer<typeof OpenTabunganSchema>;
export type SetorInput = z.infer<typeof SetorSchema>;
export type TarikInput = z.infer<typeof TarikSchema>;
