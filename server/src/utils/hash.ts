import bcrypt from "bcrypt";

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

/**
 * Hash a plain text password
 */
export const hashPassword = async (plain: string): Promise<string> =>
  bcrypt.hash(plain, ROUNDS);

/**
 * Compare plain password with hashed password
 */
export const comparePassword = async (
  plain: string,
  hash: string
): Promise<boolean> => bcrypt.compare(plain, hash);
