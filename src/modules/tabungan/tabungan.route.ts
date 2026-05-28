import { Router } from "express";
import { tabunganController } from "./tabungan.controller";
import { requireAuth } from "../../middleware/auth.middleware";

export const tabunganRoutes = Router();

tabunganRoutes.use(requireAuth);

tabunganRoutes.post("/", tabunganController.open);
tabunganRoutes.get("/estimasi", tabunganController.estimasi);
tabunganRoutes.get("/:id", tabunganController.findById);
tabunganRoutes.get("/:id/mutasi", tabunganController.listMutasi);
tabunganRoutes.post("/:id/setor", tabunganController.setor);
