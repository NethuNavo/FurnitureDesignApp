import { NextResponse } from "next/server";
import { connectDB } from "@/app/api/_lib/mongodb";
import { Design } from "@/app/api/_lib/models";
import { validateSession, extractToken } from "@/app/api/_lib/auth";
import type { DesignRoom, DesignFurniture } from "@/app/api/_lib/models";

// Expected payload for creating a new design.
type CreateDesignBody = {
  name?: string;
  room?: DesignRoom;
  furniture?: DesignFurniture[] | string;
};

// GET /api/designs
// Returns designs for the authenticated user from MongoDB.
export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: token is required." },
        { status: 401 },
      );
    }

    const sessionUserId = await validateSession(token);
    if (!sessionUserId) {
      return NextResponse.json(
        { error: "Unauthorized: invalid or expired token." },
        { status: 401 },
      );
    }

    await connectDB();

    const designs = await Design.find({ userId: sessionUserId }).populate(
      "userId",
      "name email",
    );

    // Normalize to always expose payload-based structures, even for any older docs.
    const normalizedDesigns = designs.map((d) => {
      const obj = d.toObject() as any;
      if (!obj.payload) {
        obj.payload = {
          room: obj.room,
          furniture: obj.furniture || [],
        };
        delete obj.room;
        delete obj.furniture;
      }
      return obj;
    });

    return NextResponse.json({ designs: normalizedDesigns });
  } catch (error) {
    console.error("Get designs error:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching designs." },
      { status: 500 },
    );
  }
}

// POST /api/designs
// Creates a new design record in MongoDB.
export async function POST(request: Request) {
  let body: CreateDesignBody;
  try {
    // Parse incoming JSON body.
    body = (await request.json()) as CreateDesignBody;
  } catch {
    // Malformed JSON request body.
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Normalize incoming fields (name & room only; userId is derived from the session).
  const name = body.name?.trim() || "";
  const room = body.room;
  let furniture = body.furniture ?? [];

  // Normalize furniture into an array of objects expected by the schema.
  // In some edge-cases the client may send a single long string (or an array
  // with a single string) that contains a JS-like representation of the
  // furniture array. We defensively try to parse that into a real array.
  const parseFurnitureString = (raw: string): DesignFurniture[] => {
    try {
      const withoutConcat = raw.replace(/'\s*\+\s*'/g, "");
      const trimmed = withoutConcat.trim();

      // If it already looks like JSON (double quotes, valid brackets), use JSON.parse.
      if (/^[\[\{]/.test(trimmed) && trimmed.includes('"')) {
        return JSON.parse(trimmed) as DesignFurniture[];
      }

      // Convert a JS-style object/array literal (single quotes, unquoted keys)
      // into JSON, then parse.
      const withQuotedKeys = trimmed.replace(
        /(['"])?([a-zA-Z0-9_]+)\1\s*:/g,
        '"$2":',
      );
      const jsonLike = withQuotedKeys.replace(/'/g, '"');
      return JSON.parse(jsonLike) as DesignFurniture[];
    } catch (e) {
      console.error("Failed to parse furniture string payload:", e);
      return [];
    }
  };

  if (typeof furniture === "string") {
    furniture = parseFurnitureString(furniture);
  } else if (
    Array.isArray(furniture) &&
    furniture.length === 1 &&
    typeof furniture[0] === "string"
  ) {
    // Case where the entire furniture payload was wrapped into a single
    // string inside an array: ["[{...}, {...}]"]
    furniture = parseFurnitureString(furniture[0] as string);
  }

  if (!Array.isArray(furniture)) {
    furniture = [];
  }

  // Required fields validation.
  if (!name || !room) {
    return NextResponse.json(
      { error: "name and room are required." },
      { status: 400 },
    );
  }

  try {
    // Connect to MongoDB
    await connectDB();

    // Verify the token and obtain userId
    const token = extractToken(request);
    let sessionUserId: string | null = null;
    if (token) {
      sessionUserId = await validateSession(token);
      if (!sessionUserId) {
        return NextResponse.json(
          { error: "Unauthorized: invalid or expired token." },
          { status: 401 },
        );
      }
    } else {
      // Must be authenticated to save a design
      return NextResponse.json(
        { error: "Unauthorized: token is required to save designs." },
        { status: 401 },
      );
    }

    // Build new design object using verified userId
    const design = new Design({
      userId: sessionUserId,
      name,
      payload: { room, furniture },
    });

    // Save to MongoDB
    await design.save();
    await design.populate("userId", "name email");

    // Return created resource with 201 status.
    return NextResponse.json({ design }, { status: 201 });
  } catch (error) {
    console.error("Create design error:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the design." },
      { status: 500 },
    );
  }
}

