import { NextResponse } from "next/server";
import { connectDB } from "@/app/api/_lib/mongodb";
import { User } from "@/app/api/_lib/models";
import {
  hashPassword,
  createSession,
  sanitizeUser,
} from "@/app/api/_lib/auth";
import {
  validateEmail,
  validatePassword,
  validateName,
  sanitizeEmail,
  sanitizeString,
} from "@/app/api/_lib/validation";

// Expected payload for user registration.
type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

// POST /api/auth/register
// Creates a new user in MongoDB.
export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    // Parse incoming JSON body.
    body = (await request.json()) as RegisterBody;
  } catch {
    // Request body is not valid JSON.
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Normalize/clean user inputs.
  const name = sanitizeString(body.name || "");
  const email = sanitizeEmail(body.email || "");
  const password = body.password || "";

  // Validate name
  const nameValidation = validateName(name);
  if (!nameValidation.valid) {
    return NextResponse.json(
      { error: nameValidation.error },
      { status: 400 }
    );
  }

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return NextResponse.json(
      { error: emailValidation.error },
      { status: 400 }
    );
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return NextResponse.json(
      { error: passwordValidation.error },
      { status: 400 }
    );
  }

  try {
    // Connect to MongoDB
    await connectDB();

    // Prevent duplicate account registration by email.
    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json(
        { error: "Email already exists." },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create and store user record
    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Create session token
    const token = await createSession(user._id.toString());

    // Return created user without sensitive fields.
    return NextResponse.json(
      {
        message: "User registered successfully.",
        user: sanitizeUser(user),
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration." },
      { status: 500 }
    );
  }
}

