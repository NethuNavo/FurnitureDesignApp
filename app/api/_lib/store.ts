// Represents one registered user in the in-memory API store.
type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
};

// Room payload attached to a saved design.
type DesignRoom = {
  width: number;
  length: number;
  height: number;
  shape: "rectangle" | "square" | "lshape";
  colorScheme: string;
};

// One furniture item inside a saved design.
type DesignFurniture = {
  id: string;
  type: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  length: number;
  height?: number;
  rotation?: number;
  color?: string;
};

// Full design record stored by API routes.
type Design = {
  id: string;
  userId: string;
  name: string;
  room: DesignRoom;
  furniture: DesignFurniture[];
  createdAt: string;
  updatedAt: string;
};

// Simple token session model for mock auth flow.
type Session = {
  token: string;
  userId: string;
  createdAt: string;
};

// Root database shape kept in memory for development/demo APIs.
type Db = {
  users: User[];
  designs: Design[];
  sessions: Session[];
};

// Extend global scope so the in-memory DB persists across route reloads
// during local development (instead of resetting every request).
declare global {
  var __furnivisionApiDb: Db | undefined;
}

// Seed data used when the in-memory DB is first initialized.
const defaultDb: Db = {
  users: [
    {
      id: "u1",
      name: "Emma Davis",
      email: "emma.davis@example.com",
      password: "Password@123",
      createdAt: new Date().toISOString(),
    },
  ],
  designs: [],
  sessions: [],
};

// Get (or initialize) the shared in-memory DB instance.
export function getDb() {
  if (!globalThis.__furnivisionApiDb) {
    // Use a clone to avoid mutating the seed object itself.
    globalThis.__furnivisionApiDb = structuredClone(defaultDb);
  }
  return globalThis.__furnivisionApiDb;
}

// Generate lightweight unique ids for mock entities.
export function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Remove sensitive fields before returning user objects in API responses.
export function sanitizeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

// Re-export core types for use in route handlers.
export type { User, Design, DesignRoom, DesignFurniture, Session };
