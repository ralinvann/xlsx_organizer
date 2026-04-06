import { Request, Response } from "express";
import { ActivityLog } from "../models/ActivityLog";

export const listActivityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const requestedUserId = String(req.query.userId ?? "").trim();
    let targetUserId = authUser.id;

    if (requestedUserId) {
      const isAdmin = authUser.role === "admin" || authUser.role === "superadmin";
      if (!isAdmin && requestedUserId !== authUser.id) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }
      targetUserId = requestedUserId;
    }

    const query = { user: targetUserId };

    const [total, items] = await Promise.all([
      ActivityLog.countDocuments(query),
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.status(200).json({
      items,
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (err) {
    console.error("listActivityLogs error:", err);
    res.status(500).json({ message: "Gagal memuat activity log." });
  }
};
