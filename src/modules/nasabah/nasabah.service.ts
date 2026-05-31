import { prisma } from "../../library/prisma";
import { CreateNasabahInput, UpdateNasabahInput } from "./nasabah.schema";

// Field yang aman diekspos ke klien. passwordHash sengaja dikecualikan agar
// tidak pernah bocor lewat response apa pun.
const NASABAH_PUBLIC_SELECT = {
  id: true,
  nik: true,
  nama: true,
  email: true,
  nomorHp: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class SelfDeleteError extends Error {
  constructor() {
    super("Admin tidak boleh menghapus akunnya sendiri");
    this.name = "SelfDeleteError";
  }
}

export class NasabahHasActiveTabunganError extends Error {
  constructor() {
    super("Nasabah masih memiliki tabungan haji dengan saldo > 0");
    this.name = "NasabahHasActiveTabunganError";
  }
}

export const nasabahService = {
  create: (data: CreateNasabahInput) =>
    prisma.nasabah.create({ data, select: NASABAH_PUBLIC_SELECT }),

  findAll: (params: { q?: string; skip: number; take: number }) => {
    const where = params.q
      ? {
          OR: [
            { nama: { contains: params.q, mode: "insensitive" as const } },
            { email: { contains: params.q, mode: "insensitive" as const } },
            { nik: { contains: params.q } },
            { nomorHp: { contains: params.q } },
          ],
        }
      : undefined;
    return Promise.all([
      prisma.nasabah.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        select: NASABAH_PUBLIC_SELECT,
      }),
      prisma.nasabah.count({ where }),
    ]);
  },

  findById: (id: string) =>
    prisma.nasabah.findUnique({
      where: { id },
      select: NASABAH_PUBLIC_SELECT,
    }),

  update: (id: string, data: UpdateNasabahInput) =>
    prisma.nasabah.update({
      where: { id },
      data,
      select: NASABAH_PUBLIC_SELECT,
    }),

  remove: async (id: string, options: { currentUserId: string }) => {
    if (id === options.currentUserId) throw new SelfDeleteError();

    // Cegah hapus kalau masih ada tabungan aktif berisi saldo. Mencegah
    // kehilangan data finansial yang sulit di-trace.
    const hasActive = await prisma.tabunganHaji.findFirst({
      where: { nasabahId: id, saldo: { gt: 0n } },
      select: { id: true },
    });
    if (hasActive) throw new NasabahHasActiveTabunganError();

    return prisma.nasabah.delete({ where: { id } });
  },
};
