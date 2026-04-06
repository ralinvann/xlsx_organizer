import { ActivityLog, type ActivityAction } from "../models/ActivityLog";

interface LogActivityInput {
  userId?: string;
  action: ActivityAction;
  details: string;
  metadata?: Record<string, any>;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  const { userId, action, details, metadata } = input;
  if (!userId) return;

  try {
    await ActivityLog.create({
      user: userId,
      action,
      details,
      metadata,
    });
  } catch (err) {
    console.error("logActivity error:", err);
  }
}
