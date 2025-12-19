// middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../models/User";

type JwtPayload = {
  userId: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      res.status(401).json({ message: "Unauthorized (missing token)" });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ message: "Server misconfigured (JWT_SECRET missing)" });
      return;
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    if (!decoded?.userId) {
      res.status(401).json({ message: "Unauthorized (invalid token payload)" });
      return;
    }

    req.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized (invalid token)" });
    return;
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
}
