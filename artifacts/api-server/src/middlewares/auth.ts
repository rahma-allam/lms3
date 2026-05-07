import { Request, Response, NextFunction } from "express";
import { verifyAdminToken } from "../routes/admin-auth.js";
import { verifyInstructorToken } from "../routes/instructor-auth.js";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers["authorization"];
    if (!auth?.startsWith("Bearer "))
      return res.status(401).json({ error: "Unauthorized" });
    verifyAdminToken(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireInstructor(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers["authorization"];
    if (!auth?.startsWith("Bearer "))
      return res.status(401).json({ error: "Unauthorized" });
    const payload = verifyInstructorToken(auth.slice(7));
    (req as any).instructorId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
