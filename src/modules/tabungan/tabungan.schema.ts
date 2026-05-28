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

export const IdParamSchema = z.object({
  id: z.string().uuid("ID harus format UUID"),
});

export type OpenTabunganInput = z.infer<typeof OpenTabunganSchema>;
export type SetorInput = z.infer<typeof SetorSchema>;
