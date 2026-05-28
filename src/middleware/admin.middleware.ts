import type { Request, Response, NextFunction } from "express";

const getAdminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Tidak terautentikasi",
    });
  }
  const admins = getAdminEmails();
  if (!admins.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Akses hanya untuk admin",
    });
  }
  return next();
};
