import { Prisma } from "@prisma/client";
import { prisma } from "../../library/prisma";
import { OpenTabunganInput } from "./tabungan.schema";
import { HAJI_CONFIG } from "./tabungan.config";

const generateNomorRekening = () => {
  const firstDigit = Math.floor(1 + Math.random() * 9).toString();
  const rest = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  return `${firstDigit}${rest}`;
};

export class NasabahNotFoundError extends Error {
  constructor() {
    super("Nasabah belum terdaftar");
    this.name = "NasabahNotFoundError";
  }
}

export class TabunganDuplicateError extends Error {
  constructor(message = "Nasabah sudah memiliki tabungan haji") {
    super(message);
    this.name = "TabunganDuplicateError";
  }
}

export class TabunganNotFoundError extends Error {
  constructor() {
    super("Tabungan haji tidak ditemukan");
    this.name = "TabunganNotFoundError";
  }
}

export class IdempotencyKeyConflictError extends Error {
  constructor() {
    super("Idempotency-Key sudah dipakai untuk transaksi lain");
    this.name = "IdempotencyKeyConflictError";
  }
}

export const tabunganService = {
  async open(data: OpenTabunganInput) {
    const nasabah = await prisma.nasabah.findUnique({
      where: { id: data.nasabahId },
      select: { id: true },
    });
    if (!nasabah) throw new NasabahNotFoundError();

    const existing = await prisma.tabunganHaji.findFirst({
      where: { nasabahId: data.nasabahId },
      select: { id: true },
    });
    if (existing) throw new TabunganDuplicateError();

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await prisma.tabunganHaji.create({
          data: {
            nasabahId: data.nasabahId,
            nomorRekening: generateNomorRekening(),
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          (err.meta?.target as string[])?.includes("nomor_rekening")
        ) {
          continue;
        }
        throw err;
      }
    }
    throw new Error("GENERATE_NOMOR_REKENING_FAILED");
  },

  findById(id: string) {
    return prisma.tabunganHaji.findUnique({ where: { id } });
  },

  listMutasi(tabunganId: string) {
    return prisma.transaksi.findMany({
      where: { tabunganId },
      orderBy: { waktu: "desc" },
    });
  },

  async estimasi(tabunganId: string) {
    const tabungan = await prisma.tabunganHaji.findUnique({
      where: { id: tabunganId },
    });
    if (!tabungan) throw new TabunganNotFoundError();

    const saldo = tabungan.saldo;
    const setoranAwal = BigInt(HAJI_CONFIG.setoranAwalPorsi);
    const bpih = BigInt(HAJI_CONFIG.bpih);
    const tahunSekarang = new Date().getFullYear();
    const waktuTungguTahun = Math.ceil(
      HAJI_CONFIG.antrianNasional / HAJI_CONFIG.kuotaNasionalPerTahun,
    );

    let status: "BELUM_DAFTAR_PORSI" | "TERDAFTAR_PORSI" | "LUNAS";
    let kekuranganSetoranAwal = 0n;
    let kekuranganPelunasan = 0n;
    let estimasiTahunBerangkat: number | null = null;

    if (saldo < setoranAwal) {
      status = "BELUM_DAFTAR_PORSI";
      kekuranganSetoranAwal = setoranAwal - saldo;
    } else if (saldo < bpih) {
      status = "TERDAFTAR_PORSI";
      kekuranganPelunasan = bpih - saldo;
      estimasiTahunBerangkat = tahunSekarang + waktuTungguTahun;
    } else {
      status = "LUNAS";
      estimasiTahunBerangkat = tahunSekarang + waktuTungguTahun;
    }

    return {
      tabungan,
      status,
      saldo,
      kekuranganSetoranAwal,
      kekuranganPelunasan,
      tahunSekarang,
      waktuTungguTahun,
      estimasiTahunBerangkat,
      asumsi: HAJI_CONFIG,
    };
  },

  async setor(params: { tabunganId: string; nominal: number; idempotencyKey: string }) {
    const { tabunganId, nominal, idempotencyKey } = params;

    const existing = await prisma.transaksi.findUnique({
      where: { referensi: idempotencyKey },
    });
    if (existing) {
      if (existing.tabunganId !== tabunganId) {
        throw new IdempotencyKeyConflictError();
      }
      const tabungan = await prisma.tabunganHaji.findUnique({
        where: { id: tabunganId },
      });
      return { transaksi: existing, tabungan: tabungan!, replayed: true };
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.tabunganHaji.update({
          where: { id: tabunganId },
          data: { saldo: { increment: BigInt(nominal) } },
        });
        const saldoSesudah = updated.saldo;
        const saldoSebelum = saldoSesudah - BigInt(nominal);
        const transaksi = await tx.transaksi.create({
          data: {
            tabunganId,
            jenis: "SETOR",
            nominal: BigInt(nominal),
            saldoSebelum,
            saldoSesudah,
            referensi: idempotencyKey,
            metode: "QRIS",
          },
        });
        return { tabungan: updated, transaksi };
      });
      return { ...result, replayed: false };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") {
          throw new TabunganNotFoundError();
        }
        if (err.code === "P2002") {
          const winner = await prisma.transaksi.findUnique({
            where: { referensi: idempotencyKey },
          });
          if (winner && winner.tabunganId === tabunganId) {
            const tabungan = await prisma.tabunganHaji.findUnique({
              where: { id: tabunganId },
            });
            return { transaksi: winner, tabungan: tabungan!, replayed: true };
          }
          throw new IdempotencyKeyConflictError();
        }
      }
      throw err;
    }
  },
};
