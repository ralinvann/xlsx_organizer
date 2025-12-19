import bcrypt from "bcrypt";

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
