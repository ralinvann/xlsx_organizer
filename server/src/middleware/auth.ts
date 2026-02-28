import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  role: "superadmin" | "admin" | "officer";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;

  let token: string | undefined;
  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  } else if ((req as any).cookies && (req as any).cookies.token) {
    token = (req as any).cookies.token;
  }

  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = payload.userId || payload.id;
    const role = payload.role;

    if (!userId) {
      res.status(401).json({ message: "Invalid token payload" });
      return;
    }

    req.user = { id: userId, role: role as AuthUser["role"] };
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

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
