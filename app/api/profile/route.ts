import { NextResponse } from "next/server";
import { connectDB } from "@/app/api/_lib/mongodb";
import {
  getCurrentUser,
  sanitizeUser,
} from "@/app/api/_lib/auth";

type UpdateProfileBody = {
  name?: string;
  email?: string;
  profilePhoto?: string; // base64 or URL
  removePhoto?: boolean;
};

export async function GET(request: Request) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "An error occurred." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  let body: UpdateProfileBody;
  try {
    body = (await request.json()) as UpdateProfileBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (body.name) {
      const newName = body.name.trim();
      if (newName.length === 0) {
        return NextResponse.json(
          { error: "Name cannot be empty." },
          { status: 400 }
        );
      }
      user.name = newName;
    }

    if (body.email) {
      const newEmail = body.email.trim().toLowerCase();
      if (newEmail.length === 0) {
        return NextResponse.json(
          { error: "Email cannot be empty." },
          { status: 400 }
        );
      }
      // Check if email is already in use by another user
      const { User } = await import("@/app/api/_lib/models");
      const existingUser = await User.findOne({
        email: newEmail,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "Email is already in use." },
          { status: 409 }
        );
      }
      user.email = newEmail;
    }

    // handle profile photo updates / removal
    if (body.removePhoto) {
      user.profilePhoto = "";
    } else if (body.profilePhoto) {
      // very basic validation: string length
      if (typeof body.profilePhoto === "string" && body.profilePhoto.length > 0) {
        user.profilePhoto = body.profilePhoto;
      }
    }

    await user.save();

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "An error occurred while updating profile." },
      { status: 500 }
    );
  }
}
