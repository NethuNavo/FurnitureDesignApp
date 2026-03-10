import { NextResponse } from "next/server";
import { connectDB } from "@/app/api/_lib/mongodb";
import { Session } from "@/app/api/_lib/models";
import { extractToken } from "@/app/api/_lib/auth";

// POST /api/auth/logout
// Invalidates the user's session by removing the token from the database.
export async function POST(request: Request) {
  try {
    // Extract token from request
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "No valid token provided." },
        { status: 400 }
      );
    }

    await connectDB();

    // Delete the session from database
    const result = await Session.deleteOne({ token });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Session not found or already logged out." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Logged out successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "An error occurred during logout." },
      { status: 500 }
    );
  }
}
