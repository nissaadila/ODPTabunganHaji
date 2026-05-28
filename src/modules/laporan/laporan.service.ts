import { prisma } from "../../library/prisma";

export const laporanService = {
  async transaksiBulanan(bulan: string) {
    const [yearStr, monthStr] = bulan.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const rows = await prisma.transaksi.findMany({
      where: { waktu: { gte: start, lt: end } },
      orderBy: { waktu: "asc" },
      include: {
        tabungan: {
          include: {
            nasabah: { select: { id: true, nik: true, nama: true } },
          },
        },
      },
    });

    return { rows, periode: { start, end } };
  },
};
