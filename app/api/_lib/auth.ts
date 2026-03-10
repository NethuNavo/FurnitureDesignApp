import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, IUser, Session } from "@/app/api/_lib/models";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcryptjs.compare(password, hashedPassword);
}

export async function generateToken(userId: string): Promise<string> {
  const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

export async function verifyToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const secret = process.env.JWT_SECRET || "your-secret-key-change-in-production";
    const decoded = jwt.verify(token, secret) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

export function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

export async function getCurrentUser(request: Request): Promise<IUser | null> {
  const token = extractToken(request);
  if (!token) return null;

  const decoded = await verifyToken(token);
  if (!decoded) return null;

  const user = await User.findById(decoded.userId);
  return user;
}

export function sanitizeUser(user: IUser) {
  const obj = user.toObject ? user.toObject() : user;
  const { password, ...rest } = obj;
  return rest;
}

export async function createSession(userId: string): Promise<string> {
  const token = await generateToken(userId);

  // Also store in session collection for additional tracking
  const session = new Session({
    token,
    userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await session.save();
  return token;
}

export async function validateSession(token: string): Promise<string | null> {
  // Check if token exists in sessions collection
  const session = await Session.findOne({ token });
  if (!session) return null;

  // Check if token is still valid
  if (session.expiresAt < new Date()) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  // Verify JWT token
  const decoded = await verifyToken(token);
  return decoded?.userId || null;
}
