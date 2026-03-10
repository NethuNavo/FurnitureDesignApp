# Backend Setup - MongoDB Integration

This document outlines the complete MongoDB backend setup for the Furnivision project.

## Overview

The backend has been automatically configured with:
- **MongoDB**: NoSQL database for persistent data storage
- **Mongoose**: ODM (Object Document Mapper) for MongoDB
- **bcryptjs**: Password hashing and verification
- **jsonwebtoken (JWT)**: Secure authentication tokens

## Database Connection

### Environment Variables

Create a `.env.local` file at the root of your project with:

```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/furnivision?retryWrites=true&w=majority

# MongoDB Database Name
MONGODB_DB=furnivision

# JWT Secret Key (change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Next.js Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### MongoDB Setup Options

#### Option 1: MongoDB Atlas (Cloud - Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account or login
3. Create a new cluster
4. In Security > Database Access, add a database user
5. In Security > Network Access, allow your IP
6. Get your connection string from "Connect" button
7. Copy the connection string and update `.env.local`

#### Option 2: Local MongoDB
If you want to run MongoDB locally:
```bash
# Install MongoDB locally or use Docker
# Local connection string:
MONGODB_URI=mongodb://localhost:27017
```

## Database Models

### User Model
```typescript
{
  _id: ObjectId
  name: string
  email: string (unique, lowercase)
  password: string (hashed with bcryptjs)
  createdAt: Date
  updatedAt: Date
}
```

### Design Model
```typescript
{
  _id: ObjectId
  userId: ObjectId (reference to User)
  name: string
  room: {
    width: number
    length: number
    height: number
    shape: "rectangle" | "square" | "lshape"
    colorScheme: string
  }
  furniture: Array<{
    id: string
    type: string
    name?: string
    x: number
    y: number
    width: number
    length: number
    height?: number
    rotation?: number
    color?: string
  }>
  createdAt: Date
  updatedAt: Date
}
```

### Session Model
```typescript
{
  _id: ObjectId
  token: string (unique)
  userId: ObjectId (reference to User)
  createdAt: Date
  expiresAt: Date (automatically deleted after 7 days)
}
```

## API Endpoints

### Authentication

#### POST `/api/auth/register`
Create a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully.",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2026-03-01T12:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/api/auth/login`
Authenticate a user.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### GET `/api/auth/me`
Get current authenticated user.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### POST `/api/auth/change-password`
Change user password.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Request:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully."
}
```

### Profile

#### GET `/api/profile`
Get current user profile.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### PUT `/api/profile`
Update user profile.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response (200):**
```json
{
  "user": {
    "_id": "user_id",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

### Designs

#### GET `/api/designs`
Get all designs.

**Response (200):**
```json
{
  "designs": [
    {
      "_id": "design_id",
      "userId": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "name": "Living Room Design",
      "room": { ... },
      "furniture": [ ... ],
      "createdAt": "2026-03-01T12:00:00Z",
      "updatedAt": "2026-03-01T12:00:00Z"
    }
  ]
}
```

#### POST `/api/designs`
Create a new design.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Request:**
```json
{
  "userId": "user_id",
  "name": "Living Room Design",
  "room": {
    "width": 5,
    "length": 6,
    "height": 3,
    "shape": "rectangle",
    "colorScheme": "#E8DCC8"
  },
  "furniture": [
    {
      "id": "furn1",
      "type": "sofa",
      "name": "Modern Sofa",
      "x": 1,
      "y": 1,
      "width": 2,
      "length": 1,
      "color": "#333333"
    }
  ]
}
```

**Response (201):**
```json
{
  "design": {
    "_id": "design_id",
    "userId": "user_id",
    "name": "Living Room Design",
    ...
  }
}
```

#### GET `/api/designs/[id]`
Get a specific design.

**Response (200):**
```json
{
  "design": { ... }
}
```

#### PUT `/api/designs/[id]`
Update a design.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Request:**
```json
{
  "name": "Updated Room Design",
  "room": { ... },
  "furniture": [ ... ]
}
```

**Response (200):**
```json
{
  "design": { ... }
}
```

#### DELETE `/api/designs/[id]`
Delete a design.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "message": "Design deleted.",
  "design": { ... }
}
```

## File Structure

```
app/api/
├── _lib/
│   ├── mongodb.ts          # MongoDB connection setup
│   ├── models.ts           # Mongoose schemas and models
│   ├── auth.ts             # Authentication utilities
│   └── store.ts            # (Legacy, can be removed)
├── auth/
│   ├── register/route.ts   # User registration
│   ├── login/route.ts      # User login
│   ├── me/route.ts         # Get current user
│   └── change-password/route.ts # Password change
├── profile/
│   └── route.ts            # Get/update user profile
└── designs/
    ├── route.ts            # GET all designs, POST create
    └── [id]/route.ts       # GET, PUT, DELETE individual design
```

## Key Features Implemented

✅ User registration with password hashing
✅ User login with JWT authentication
✅ Session management with auto-expiration (7 days)
✅ Password hashing using bcryptjs
✅ JWT token-based authentication
✅ Authorization checks for design operations
✅ MongoDB persistence for all data
✅ Password change functionality
✅ Profile update functionality
✅ Automatic timestamps (createdAt, updatedAt)

## Security Considerations

1. **Password Security**: All passwords are hashed using bcryptjs with salt rounds of 10
2. **JWT Tokens**: Tokens expire after 7 days
3. **Authorization**: Design operations verify user ownership
4. **Email Validation**: Email addresses are validated and stored in lowercase
5. **Session Cleanup**: Expired sessions are automatically deleted from the database

## Testing the API

You can test the API using tools like:
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- `curl` command line tool
- VS Code REST Client extension

### Example Test Flow

```bash
# 1. Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'

# 3. Get current user (use token from login response)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 4. Create a design
curl -X POST http://localhost:3000/api/designs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "userId": "YOUR_USER_ID",
    "name": "My Room Design",
    "room": {
      "width": 5,
      "length": 6,
      "height": 3,
      "shape": "rectangle",
      "colorScheme": "#E8DCC8"
    },
    "furniture": []
  }'
```

## Deployment

### For Production

1. Use a production MongoDB connection string (MongoDB Atlas)
2. Set strong, unique `JWT_SECRET` environment variable
3. Configure CORS if your frontend is on a different domain
4. Enable HTTPS for all API endpoints
5. Set up proper error logging and monitoring

### Environment-specific Configuration

Create different `.env.local` files for development and production, or use environment variables in your deployment platform (Vercel, Heroku, etc.).

## Troubleshooting

### MongoDB Connection Issues
- Verify your connection string in `.env.local`
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure the database user has correct permissions

### JWT Token Errors
- Make sure the token is being sent with "Bearer " prefix
- Check if the token has expired (7-day expiration)
- Verify the JWT_SECRET matches between signing and verification

### Import Errors
- Clear your Next.js cache: `npm run build` 
- Restart your dev server: `npm run dev`
- Check that all TypeScript types are properly imported

## Next Steps

1. Connect your MongoDB database
2. Set the `JWT_SECRET` in `.env.local`
3. Update your frontend to use the new API endpoints with authentication
4. Test all endpoints thoroughly
5. Deploy to production with proper security measures
