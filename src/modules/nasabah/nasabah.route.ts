import { Router } from "express";
import { nasabahController } from "./nasabah.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";


export const nasabahRoutes = Router();


// Registrasi nasabah baru — endpoint publik (self-service).
nasabahRoutes.post("/", nasabahController.create);

// CRUD nasabah (read/update/delete) hanya boleh diakses admin.
nasabahRoutes.get("/", requireAuth, requireAdmin, nasabahController.findAll);
nasabahRoutes.get("/:id", requireAuth, requireAdmin, nasabahController.findById);
nasabahRoutes.patch("/:id", requireAuth, requireAdmin, nasabahController.update);
nasabahRoutes.delete("/:id", requireAuth, requireAdmin, nasabahController.remove);
