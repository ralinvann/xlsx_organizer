import bcrypt from "bcrypt";

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10);

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, ROUNDS);

export const comparePassword = async (
  plain: string,
  hash: string
): Promise<boolean> => bcrypt.compare(plain, hash);
