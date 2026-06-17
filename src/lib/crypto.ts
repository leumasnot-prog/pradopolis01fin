import crypto from "node:crypto";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const checkHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return hash === checkHash;
  } catch (err) {
    console.error("Error verifying password:", err);
    return false;
  }
}
