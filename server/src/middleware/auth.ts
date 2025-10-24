import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  role: "superadmin" | "admin" | "officer";
}

// Proper global augmentation for req.user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware: Verify JWT token and attach user payload to req.user
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  try {
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;

    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * Middleware: Restrict access based on user roles
 */
export const requireRole =
  (...roles: AuthUser["role"][]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: No user context" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden: Insufficient privileges" });
      return;
    }

    next();
  };
