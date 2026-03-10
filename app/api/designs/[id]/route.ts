import { NextResponse } from "next/server";
import { connectDB } from "@/app/api/_lib/mongodb";
import { Design } from "@/app/api/_lib/models";
import { validateSession, extractToken } from "@/app/api/_lib/auth";
import { handleCORS, addCORSHeaders } from "@/app/api/_lib/cors";
import type { DesignRoom, DesignFurniture } from "@/app/api/_lib/models";

// Route handler context for dynamic segment /api/designs/[id].
type RouteContext = {
  params: Promise<{ id: string }>;
};

// Allowed fields for partial design updates.
type UpdateDesignBody = {
  name?: string;
  room?: DesignRoom;
  furniture?: DesignFurniture[] | string;
};

// Helper to normalize furniture when it accidentally arrives as a string.
// Mirrors the logic used in POST /api/designs.
const parseFurnitureString = (raw: string): DesignFurniture[] => {
  try {
    const withoutConcat = raw.replace(/'\s*\+\s*'/g, "");
    const trimmed = withoutConcat.trim();

    if (/^[\[\{]/.test(trimmed) && trimmed.includes('"')) {
      return JSON.parse(trimmed) as DesignFurniture[];
    }

    const withQuotedKeys = trimmed.replace(
      /(['"])?([a-zA-Z0-9_]+)\1\s*:/g,
      '"$2":'
    );
    const jsonLike = withQuotedKeys.replace(/'/g, '"');
    return JSON.parse(jsonLike) as DesignFurniture[];
  } catch (e) {
    console.error("Failed to parse furniture string payload (update):", e);
    return [];
  }
};

// OPTIONS /api/designs/[id]
// Handle CORS preflight requests.
export async function OPTIONS() {
  return handleCORS();
}

// GET /api/designs/[id]
// Returns one design by id from MongoDB.
export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    await connectDB();

    // Find matching design in MongoDB.
    const design = await Design.findById(params.id).populate(
      "userId",
      "name email"
    );
    if (!design) {
      // Design id does not exist.
      return addCORSHeaders(
        NextResponse.json(
          { error: "Design not found." },
          { status: 404 }
        )
      );
    }

    // Normalize design to ensure it has payload structure (for backward compatibility)
    const obj = design.toObject() as any;
    if (!obj.payload) {
      obj.payload = {
        room: obj.room,
        furniture: obj.furniture || [],
      };
      delete obj.room;
      delete obj.furniture;
    }

    // Return design payload.
    return addCORSHeaders(
      NextResponse.json({ design: obj })
    );
  } catch (error) {
    console.error("Get design error:", error);
    return addCORSHeaders(
      NextResponse.json(
        { error: "An error occurred while fetching the design." },
        { status: 500 }
      )
    );
  }
}

// PUT /api/designs/[id]
// Partially updates name/room/furniture of an existing design in MongoDB.
export async function PUT(request: Request, context: RouteContext) {
  let body: UpdateDesignBody;
  try {
    // Parse update payload.
    body = (await request.json()) as UpdateDesignBody;
  } catch {
    // Request body is not valid JSON.
    return addCORSHeaders(
      NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    );
  }

  try {
    const params = await context.params;
    await connectDB();

    // Find design by id.
    const design = await Design.findById(params.id) as any;
    if (!design) {
      // Design not found.
      return addCORSHeaders(
        NextResponse.json(
          { error: "Design not found." },
          { status: 404 }
        )
      );
    }

    // Normalize design to ensure it has payload structure (for backward compatibility)
    if (!design.payload) {
      design.payload = {
        room: design.room || {},
        furniture: design.furniture || [],
      };
    }

    // Check authorization
    const token = extractToken(request);
    if (token) {
      const sessionUserId = await validateSession(token);
      if (
        sessionUserId &&
        sessionUserId !== design.userId.toString()
      ) {
        return addCORSHeaders(
          NextResponse.json(
            { error: "Unauthorized: cannot update another user's design." },
            { status: 403 }
          )
        );
      }
    }

    // Merge partial updates; preserve old values when omitted.
    if (body.name !== undefined) {
      design.name = body.name.trim();
    }
    if (body.room !== undefined) {
      design.payload.room = body.room;
    }
    
    // Handle furniture update with proper parsing
    let furniture = body.furniture ?? [];
    
    if (typeof furniture === "string") {
      furniture = parseFurnitureString(furniture);
    } else if (
      Array.isArray(furniture) &&
      furniture.length === 1 &&
      typeof furniture[0] === "string"
    ) {
      furniture = parseFurnitureString(furniture[0] as string);
    }
    
    if (!Array.isArray(furniture)) {
      furniture = [];
    }
    
    design.payload.furniture = furniture;

    // Save updated design to MongoDB.
    await design.save();
    await design.populate("userId", "name email");

    // Return updated design.
    return addCORSHeaders(
      NextResponse.json({ design })
    );
  } catch (error) {
    console.error("Update design error:", error);
    return addCORSHeaders(
      NextResponse.json(
        { error: "An error occurred while updating the design." },
        { status: 500 }
      )
    );
  }
}

// DELETE /api/designs/[id]
// Deletes one design by id from MongoDB.
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    await connectDB();

    // Find design by id first (for authorization check)
    const design = await Design.findById(params.id);
    if (!design) {
      // Design not found.
      return addCORSHeaders(
        NextResponse.json(
          { error: "Design not found." },
          { status: 404 }
        )
      );
    }

    // Check authorization
    const token = extractToken(request);
    if (token) {
      const sessionUserId = await validateSession(token);
      if (
        sessionUserId &&
        sessionUserId !== design.userId.toString()
      ) {
        return addCORSHeaders(
          NextResponse.json(
            { error: "Unauthorized: cannot delete another user's design." },
            { status: 403 }
          )
        );
      }
    }

    // Delete the design
    await Design.findByIdAndDelete(params.id);

    // Return deleted record.
    return addCORSHeaders(
      NextResponse.json({
        message: "Design deleted.",
        design,
      })
    );
  } catch (error) {
    console.error("Delete design error:", error);
    return addCORSHeaders(
      NextResponse.json(
        { error: "An error occurred while deleting the design." },
        { status: 500 }
      )
    );
  }
}