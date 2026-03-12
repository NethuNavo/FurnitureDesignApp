import { NextResponse } from "next/server";
import { connectDB } from "@/app/api/_lib/mongodb";
import { User } from "@/app/api/_lib/models";
import { extractToken, verifyToken, sanitizeUser, validateSession } from "@/app/api/_lib/auth";

// GET /api/auth/me
// Returns the currently authenticated user from MongoDB.
export async function GET(request: Request) {
  try {
    // 1) Parse bearer token from request headers.
    const token = extractToken(request);
    if (!token) {
      // No valid bearer token format was provided.
      return NextResponse.json(
        { error: "Missing bearer token." },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    await connectDB();

    // 2) Validate session and get userId
    const userId = await validateSession(token);
    if (!userId) {
      // Token does not map to an active session or is expired.
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    // 3) Resolve user from database
    const user = await User.findById(userId);
    if (!user) {
      // Session exists but linked user record is missing.
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // 4) Return safe user payload (without password).
    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "An error occurred." },
      { status: 500 }
    );
  }
}

