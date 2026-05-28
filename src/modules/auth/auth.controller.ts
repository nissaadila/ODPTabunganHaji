import type { Request, Response } from "express";
import { LoginSchema, SetPasswordSchema } from "./auth.schema";
import {
  authService,
  InvalidCredentialsError,
  NasabahNotFoundError,
  PasswordAlreadySetError,
  PasswordNotSetError,
} from "./auth.service";

export const authController = {
  async login(req: Request, res: Response) {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await authService.login(parsed.data);
      return res.status(200).json(result);
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        return res.status(401).json({
          error: "INVALID_CREDENTIALS",
          message: err.message,
        });
      }
      if (err instanceof PasswordNotSetError) {
        return res.status(403).json({
          error: "PASSWORD_NOT_SET",
          message: err.message,
        });
      }
      throw err;
    }
  },

  async logout(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Tidak terautentikasi",
      });
    }
    await authService.logout({ jti: req.user.jti, exp: req.user.exp });
    return res.status(200).json({
      message: "Logout berhasil, token sudah di-invalidate",
    });
  },

  async setPassword(req: Request, res: Response) {
    const parsed = SetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await authService.setPassword(parsed.data);
      return res.status(200).json({
        message: "Password berhasil diatur",
        ...result,
      });
    } catch (err) {
      if (err instanceof NasabahNotFoundError) {
        return res.status(404).json({
          error: "NOT_FOUND",
          message: err.message,
        });
      }
      if (err instanceof PasswordAlreadySetError) {
        return res.status(409).json({
          error: "PASSWORD_ALREADY_SET",
          message: err.message,
        });
      }
      throw err;
    }
  },
};
