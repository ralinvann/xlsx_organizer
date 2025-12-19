// middleware/requireAuth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  name?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized (missing token)" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res
        .status(500)
        .json({ message: "Server misconfigured (JWT_SECRET missing)" });
    }

    const decoded = jwt.verify(token, secret) as AuthUser;
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized (invalid token)" });
  }
}
