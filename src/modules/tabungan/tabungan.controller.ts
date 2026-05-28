import type { Request, Response } from "express";
import {
  OpenTabunganSchema,
  SetorSchema,
  IdParamSchema,
} from "./tabungan.schema";
import {
  tabunganService,
  NasabahNotFoundError,
  TabunganDuplicateError,
  TabunganNotFoundError,
  IdempotencyKeyConflictError,
} from "./tabungan.service";

type TabunganRecord = {
  id: string;
  nasabahId: string;
  nomorRekening: string;
  saldo: bigint;
  status: string;
  dibukaAt: Date;
};

const serializeTabungan = (t: TabunganRecord) => ({
  ...t,
  saldo: t.saldo.toString(),
});

const serializeTransaksi = (tr: {
  id: string;
  tabunganId: string;
  jenis: string;
  nominal: bigint;
  saldoSebelum: bigint;
  saldoSesudah: bigint;
  referensi: string;
  metode: string | null;
  waktu: Date;
}) => ({
  ...tr,
  nominal: tr.nominal.toString(),
  saldoSebelum: tr.saldoSebelum.toString(),
  saldoSesudah: tr.saldoSesudah.toString(),
});

export const tabunganController = {
  async open(req: Request, res: Response) {
    const parsed = OpenTabunganSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const tabungan = await tabunganService.open(parsed.data);
      return res.status(201).json(serializeTabungan(tabungan));
    } catch (err) {
      if (err instanceof NasabahNotFoundError) {
        return res.status(403).json({
          error: "NASABAH_NOT_REGISTERED",
          message: err.message,
        });
      }
      if (err instanceof TabunganDuplicateError) {
        return res.status(409).json({
          error: "DUPLICATE_ENTRY",
          message: err.message,
        });
      }
      throw err;
    }
  },

  async findById(req: Request, res: Response) {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const tabungan = await tabunganService.findById(parsed.data.id);
    if (!tabungan) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Tabungan haji tidak ditemukan",
      });
    }
    return res.status(200).json(serializeTabungan(tabungan));
  },

  async estimasi(req: Request, res: Response) {
    const parsed = IdParamSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Query param 'id' wajib diisi dengan UUID tabungan",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const e = await tabunganService.estimasi(parsed.data.id);
      return res.status(200).json({
        tabunganId: e.tabungan.id,
        nomorRekening: e.tabungan.nomorRekening,
        status: e.status,
        saldo: e.saldo.toString(),
        kekuranganSetoranAwal: e.kekuranganSetoranAwal.toString(),
        kekuranganPelunasan: e.kekuranganPelunasan.toString(),
        tahunSekarang: e.tahunSekarang,
        waktuTungguTahun: e.waktuTungguTahun,
        estimasiTahunBerangkat: e.estimasiTahunBerangkat,
        asumsi: e.asumsi,
      });
    } catch (err) {
      if (err instanceof TabunganNotFoundError) {
        return res.status(404).json({
          error: "NOT_FOUND",
          message: err.message,
        });
      }
      throw err;
    }
  },

  async listMutasi(req: Request, res: Response) {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const tabungan = await tabunganService.findById(parsed.data.id);
    if (!tabungan) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Tabungan haji tidak ditemukan",
      });
    }

    const mutasi = await tabunganService.listMutasi(parsed.data.id);
    return res.status(200).json({
      tabunganId: parsed.data.id,
      total: mutasi.length,
      data: mutasi.map(serializeTransaksi),
    });
  },

  async setor(req: Request, res: Response) {
    const paramsParsed = IdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      return res.status(400).json({
        error: "IDEMPOTENCY_KEY_REQUIRED",
        message: "Header Idempotency-Key wajib diisi",
      });
    }

    const bodyParsed = SetorSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: bodyParsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await tabunganService.setor({
        tabunganId: paramsParsed.data.id,
        nominal: bodyParsed.data.nominal,
        idempotencyKey,
      });

      const status = result.replayed ? 200 : 201;
      return res.status(status).json({
        replayed: result.replayed,
        transaksi: serializeTransaksi(result.transaksi),
        tabungan: serializeTabungan(result.tabungan),
      });
    } catch (err) {
      if (err instanceof TabunganNotFoundError) {
        return res.status(404).json({
          error: "NOT_FOUND",
          message: err.message,
        });
      }
      if (err instanceof IdempotencyKeyConflictError) {
        return res.status(409).json({
          error: "IDEMPOTENCY_KEY_CONFLICT",
          message: err.message,
        });
      }
      throw err;
    }
  },
};
