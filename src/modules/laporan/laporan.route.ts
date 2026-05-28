import { Router } from "express";
import { laporanController } from "./laporan.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";

export const laporanRoutes = Router();

laporanRoutes.use(requireAuth, requireAdmin);

laporanRoutes.get("/transaksi", laporanController.transaksiBulanan);
