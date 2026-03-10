import mongoose, { Schema, Document, Model, Types } from "mongoose";

// User interface and schema
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Design Furniture interface
interface DesignFurniture {
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
}

// Design Room interface
interface DesignRoom {
  width: number;
  length: number;
  height: number;
  shape: "rectangle" | "square" | "lshape";
  colorScheme: string;
}

// Design interface and schema
export interface IDesign extends Document {
  _id: Types.ObjectId;
  userId: mongoose.Types.ObjectId | string;
  name: string;
  payload: {
    room: DesignRoom;
    furniture: DesignFurniture[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const designSchema = new Schema<IDesign>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    payload: {
      room: {
        width: { type: Number, required: true },
        length: { type: Number, required: true },
        height: { type: Number, required: true },
        shape: {
          type: String,
          enum: ["rectangle", "square", "lshape"],
          required: true,
        },
        colorScheme: { type: String, required: true },
      },
      furniture: [
        {
          id: { type: String, required: true },
          type: { type: String, required: true },
          name: String,
          x: { type: Number, required: true },
          y: { type: Number, required: true },
          width: { type: Number, required: true },
          length: { type: Number, required: true },
          height: Number,
          rotation: Number,
          color: String,
        },
      ],
    },
  },
  { timestamps: true }
);

// Session interface and schema
export interface ISession extends Document {
  _id: Types.ObjectId;
  token: string;
  userId: mongoose.Types.ObjectId | string;
  createdAt: Date;
  expiresAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      index: { expireAfterSeconds: 0 }, // Auto-delete expired sessions
    },
  },
  { timestamps: true }
);

// Create or get models
export const User =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);

export const Design =
  (mongoose.models.DesignV2 as Model<IDesign>) ||
  mongoose.model<IDesign>("DesignV2", designSchema, "designs");

export const Session =
  (mongoose.models.Session as Model<ISession>) ||
  mongoose.model<ISession>("Session", sessionSchema);

export type { DesignFurniture, DesignRoom };