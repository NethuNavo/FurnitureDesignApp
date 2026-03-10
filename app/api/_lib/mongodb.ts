import mongoose, { Connection, Mongoose } from "mongoose";

declare global {
  var mongooseConn: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
}

let cached = globalThis.mongooseConn || { conn: null, promise: null };

if (!globalThis.mongooseConn) {
  globalThis.mongooseConn = cached;
}

export async function connectDB(): Promise<Mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    cached.promise = mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB || "furnivision",
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export function getMongoose(): Mongoose {
  if (!cached.conn) {
    throw new Error("Database not connected");
  }
  return cached.conn;
}
