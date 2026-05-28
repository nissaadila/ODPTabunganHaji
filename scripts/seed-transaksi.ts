import { randomUUID } from "crypto";
import { prisma } from "../src/library/prisma";

const TABUNGAN_ID = process.argv[2] ?? "fc673eb3-c606-4503-8616-c0cd268be68e";
const SETORAN: number[] = [150_000, 250_000, 500_000, 100_000, 200_000];

async function main() {
  const tabungan = await prisma.tabunganHaji.findUnique({
    where: { id: TABUNGAN_ID },
  });
  if (!tabungan) {
    console.error(`Tabungan ${TABUNGAN_ID} tidak ditemukan`);
    process.exit(1);
  }

  console.log(`Tabungan: ${tabungan.nomorRekening}`);
  console.log(`Saldo awal: Rp ${tabungan.saldo.toString()}`);
  console.log(`Akan setor ${SETORAN.length} transaksi: ${SETORAN.join(", ")}\n`);

  let saldo = tabungan.saldo;
  for (const nominal of SETORAN) {
    const saldoSebelum = saldo;
    const saldoSesudah = saldo + BigInt(nominal);
    const referensi = `seed-${randomUUID()}`;

    await prisma.$transaction([
      prisma.tabunganHaji.update({
        where: { id: TABUNGAN_ID },
        data: { saldo: saldoSesudah },
      }),
      prisma.transaksi.create({
        data: {
          tabunganId: TABUNGAN_ID,
          jenis: "SETOR",
          nominal: BigInt(nominal),
          saldoSebelum,
          saldoSesudah,
          referensi,
          metode: "QRIS",
        },
      }),
    ]);

    saldo = saldoSesudah;
    console.log(`✓ Setor Rp ${nominal.toLocaleString("id-ID")} → saldo Rp ${saldo.toString()}`);
  }

  console.log(`\nSaldo akhir: Rp ${saldo.toString()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
