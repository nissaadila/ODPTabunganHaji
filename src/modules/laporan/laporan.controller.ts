import type { Request, Response } from "express";
import { LaporanQuerySchema } from "./laporan.schema";
import { laporanService } from "./laporan.service";

const escapeCsv = (val: string | number | bigint | null | undefined) => {
  if (val === null || val === undefined) return "";
  const s = typeof val === "bigint" ? val.toString() : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const CSV_HEADER = [
  "waktu",
  "tabungan_id",
  "nomor_rekening",
  "nasabah_id",
  "nik",
  "nama_nasabah",
  "jenis",
  "nominal",
  "saldo_sebelum",
  "saldo_sesudah",
  "referensi",
  "metode",
];

export const laporanController = {
  async transaksiBulanan(req: Request, res: Response) {
    const parsed = LaporanQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { rows } = await laporanService.transaksiBulanan(parsed.data.bulan);

    const lines: string[] = [CSV_HEADER.join(",")];
    for (const r of rows) {
      lines.push(
        [
          escapeCsv(r.waktu.toISOString()),
          escapeCsv(r.tabunganId),
          escapeCsv(r.tabungan.nomorRekening),
          escapeCsv(r.tabungan.nasabah.id),
          escapeCsv(r.tabungan.nasabah.nik),
          escapeCsv(r.tabungan.nasabah.nama),
          escapeCsv(r.jenis),
          escapeCsv(r.nominal),
          escapeCsv(r.saldoSebelum),
          escapeCsv(r.saldoSesudah),
          escapeCsv(r.referensi),
          escapeCsv(r.metode),
        ].join(","),
      );
    }
    const csv = lines.join("\n");
    const filename = `laporan-transaksi-${parsed.data.bulan}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );
    return res.status(200).send(csv);
  },
};
