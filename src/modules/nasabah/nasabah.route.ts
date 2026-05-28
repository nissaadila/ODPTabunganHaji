import { Router } from "express";
import { nasabahController } from "./nasabah.controller";
import { requireAuth } from "../../middleware/auth.middleware";


export const nasabahRoutes = Router();


nasabahRoutes.post("/", nasabahController.create);
nasabahRoutes.get("/", requireAuth, nasabahController.findAll);
nasabahRoutes.get("/:id", requireAuth, nasabahController.findById);
nasabahRoutes.patch("/:id", requireAuth, nasabahController.update);
nasabahRoutes.delete("/:id", requireAuth, nasabahController.remove);
