import { Router } from "express";
import { authController } from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";

export const authRoutes = Router();

authRoutes.post("/login", authController.login);
authRoutes.get("/me", requireAuth, authController.me);
authRoutes.post("/set-password", authController.setPassword);
authRoutes.post("/logout", requireAuth, authController.logout);
