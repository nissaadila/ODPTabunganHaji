import type { Request, Response, NextFunction } from "express";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { prisma } from "../library/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: { sub: string; email: string; jti: string; exp: number };
    }
  }
}

type JwtPayload = { sub: string; email: string; jti?: string; exp?: number };

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const header = req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Token tidak ditemukan. Sertakan header Authorization: Bearer <token>",
    });
  }

  const token = header.slice(7).trim();
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      error: "CONFIG_ERROR",
      message: "JWT_SECRET belum diset di environment",
    });
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, secret) as JwtPayload;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return res.status(401).json({
        error: "TOKEN_EXPIRED",
        message: "Token kadaluarsa, silakan login ulang",
      });
    }
    if (err instanceof JsonWebTokenError) {
      return res.status(401).json({
        error: "INVALID_TOKEN",
        message: "Token tidak valid",
      });
    }
    throw err;
  }

  if (!payload.jti || !payload.exp) {
    return res.status(401).json({
      error: "INVALID_TOKEN",
      message: "Token tidak memiliki jti/exp",
    });
  }

  const revoked = await prisma.revokedToken.findUnique({
    where: { jti: payload.jti },
    select: { jti: true },
  });
  if (revoked) {
    return res.status(401).json({
      error: "TOKEN_REVOKED",
      message: "Token sudah di-logout, silakan login ulang",
    });
  }

  req.user = {
    sub: payload.sub,
    email: payload.email,
    jti: payload.jti,
    exp: payload.exp,
  };
  return next();
};
