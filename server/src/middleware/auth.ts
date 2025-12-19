import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

type JwtPayload = {
  userId: string;
  role: UserRole;
};

// If you already have this in a .d.ts file, keep it there instead.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole };
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export const requireRole =
  (...allowed: UserRole[]): RequestHandler =>
  (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!allowed.includes(role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
