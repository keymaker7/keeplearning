import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }
  next();
}

export function requireTeacher(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || req.user?.role !== "teacher") {
    return res.status(403).json({ message: "교사 권한이 필요합니다." });
  }
  next();
}
