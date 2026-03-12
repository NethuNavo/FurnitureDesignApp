import { NextResponse } from "next/server";
import { connectDB } from "@/app/api/_lib/mongodb";
import { User } from "@/app/api/_lib/models";
import {
  comparePassword,
  createSession,
  sanitizeUser,
} from "@/app/api/_lib/auth";
import { validateEmail, sanitizeEmail } from "@/app/api/_lib/validation";

// Expected payload for login requests.
type LoginBody = {
  email?: string;
  password?: string;
};

// POST /api/auth/login
// Authenticates a user against MongoDB and returns a session token.
export async function POST(request: Request) {
  let body: LoginBody;
  try {
    // Parse JSON body from incoming request.
    body = (await request.json()) as LoginBody;
  } catch {
    // Malformed JSON payload.
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Normalize email for case-insensitive matching.
  const email = sanitizeEmail(body.email || "");
  const password = body.password || "";

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return NextResponse.json(
      { error: emailValidation.error },
      { status: 400 }
    );
  }

  // Validate password is provided
  if (!password) {
    return NextResponse.json(
      { error: "Password is required." },
      { status: 400 }
    );
  }

  try {
    // Connect to MongoDB
    await connectDB();

    // Check credentials against MongoDB.
    const user = await User.findOne({ email });
    if (!user) {
      // User not found.
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Compare provided password with stored hash
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      // Password is invalid.
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Create a new session token and store it.
    const token = await createSession(user._id.toString());

    // Return token + safe user payload (without password).
    return NextResponse.json(
      {
        message: "Login successful.",
        token,
        user: sanitizeUser(user),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login." },
      { status: 500 }
    );
  }
}
