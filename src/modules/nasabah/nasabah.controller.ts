import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import {
  CreateNasabahSchema,
  UpdateNasabahSchema,
  IdParamSchema,
  ListNasabahQuerySchema,
} from "./nasabah.schema";
import {
  nasabahService,
  SelfDeleteError,
  NasabahHasActiveTabunganError,
} from "./nasabah.service";

export const nasabahController = {
  async create(req: Request, res: Response) {
    const parsed = CreateNasabahSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const nasabah = await nasabahService.create(parsed.data);
      return res.status(201).json(nasabah);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const field = (err.meta?.target as string[])?.[0] ?? "field";
        return res.status(409).json({
          error: "DUPLICATE_ENTRY",
          message: `${field} sudah terdaftar`,
        });
      }
      throw err;
    }
  },

  async findAll(req: Request, res: Response) {
    const queryParsed = ListNasabahQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: queryParsed.error.flatten().fieldErrors,
      });
    }
    const { q, page, pageSize } = queryParsed.data;
    const [data, total] = await nasabahService.findAll({
      q,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return res.status(200).json({ data, total, page, pageSize });
  },

  async findById(req: Request, res: Response) {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const nasabah = await nasabahService.findById(parsed.data.id);
    if (!nasabah) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Nasabah tidak ditemukan",
      });
    }
    return res.status(200).json(nasabah);
  },

  async update(req: Request, res: Response) {
    const paramsParsed = IdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: paramsParsed.error.flatten().fieldErrors,
      });
    }

    const bodyParsed = UpdateNasabahSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: bodyParsed.error.flatten().fieldErrors,
      });
    }

    try {
      const nasabah = await nasabahService.update(
        paramsParsed.data.id,
        bodyParsed.data,
      );
      return res.status(200).json(nasabah);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") {
          return res.status(404).json({
            error: "NOT_FOUND",
            message: "Nasabah tidak ditemukan",
          });
        }
        if (err.code === "P2002") {
          const field = (err.meta?.target as string[])?.[0] ?? "field";
          return res.status(409).json({
            error: "DUPLICATE_ENTRY",
            message: `${field} sudah terdaftar`,
          });
        }
      }
      throw err;
    }
  },

  async remove(req: Request, res: Response) {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      });
    }
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Tidak terautentikasi",
      });
    }

    try {
      await nasabahService.remove(parsed.data.id, {
        currentUserId: req.user.sub,
      });
      return res.status(204).send();
    } catch (err) {
      if (err instanceof SelfDeleteError) {
        return res.status(403).json({
          error: "SELF_DELETE_FORBIDDEN",
          message: err.message,
        });
      }
      if (err instanceof NasabahHasActiveTabunganError) {
        return res.status(409).json({
          error: "NASABAH_HAS_ACTIVE_TABUNGAN",
          message: err.message,
        });
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return res.status(404).json({
          error: "NOT_FOUND",
          message: "Nasabah tidak ditemukan",
        });
      }
      throw err;
    }
  },
};
