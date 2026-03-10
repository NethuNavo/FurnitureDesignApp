# Quick Start Guide - Backend Setup Complete ✅

Your full MongoDB-backed backend is now ready! Follow these steps to get started.

## 🚀 Quick Start (5 minutes)

### 1. Set Up MongoDB

**Option A: Cloud (MongoDB Atlas) - Recommended**

1. Go to [MongoDB Atlas Free Tier](https://www.mongodb.com/cloud/atlas/register)
2. Follow the steps in [MONGODB_SETUP.md](./MONGODB_SETUP.md)
3. Copy your connection string

**Option B: Local MongoDB**

```bash
# Install Docker and run MongoDB locally
docker run -d --name mongo -p 27017:27017 mongo:latest
```

### 2. Configure Environment

1. Open `.env.local` in your project root
2. Update the `MONGODB_URI` with your connection string:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/furnivision?retryWrites=true&w=majority
   ```
3. Keep other settings as they are

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` - your app is ready!

## 📚 What's New

### Backend Features Added

✅ **MongoDB Integration**
- Persistent data storage
- Schema validation with Mongoose
- Automatic timestamps

✅ **User Authentication**
- Secure password hashing (bcryptjs)
- JWT token-based auth (7-day expiration)
- Session management

✅ **API Endpoints**
- User registration & login
- Profile management (get/update)
- Design CRUD operations (create, read, update, delete)
- Password change functionality

✅ **Security**
- Password hashing & verification
- Authorization checks (users can only modify their own designs)
- Secure token validation
- Email uniqueness constraints

### New Files Created

```
app/api/
├── _lib/
│   ├── mongodb.ts          # Database connection
│   ├── models.ts           # MongoDB schemas
│   ├── auth.ts             # Auth utilities
│   ├── store.ts            # (legacy, can remove)
├── auth/
│   ├── register/route.ts   # ✨ Updated
│   ├── login/route.ts      # ✨ Updated
│   ├── me/route.ts         # ✨ Updated
│   └── change-password/route.ts  # ✨ NEW
├── profile/
│   └── route.ts            # ✨ NEW
└── designs/
    ├── route.ts            # ✨ Updated
    └── [id]/route.ts       # ✨ Updated
```

## 🧪 Test Your API

### Using VS Code REST Client (Recommended)

1. Install "REST Client" extension in VS Code
2. Create a file named `test.http` in your project root:

```http
### 1. Register a new user
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "MyPassword123"
}

### 2. Login
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "MyPassword123"
}

### 3. Get current user (replace TOKEN with token from login)
GET http://localhost:3000/api/auth/me
Authorization: Bearer TOKEN

### 4. Get all designs
GET http://localhost:3000/api/designs

### 5. Create a design (replace USER_ID and TOKEN)
POST http://localhost:3000/api/designs
Content-Type: application/json
Authorization: Bearer TOKEN

{
  "userId": "USER_ID",
  "name": "My Living Room",
  "room": {
    "width": 5,
    "length": 6,
    "height": 3,
    "shape": "rectangle",
    "colorScheme": "#E8DCC8"
  },
  "furniture": []
}
```

3. Click "Send Request" on each endpoint to test

### Using Postman

1. Create a new collection
2. Import the endpoints from `test.http`
3. Use the variables feature to store tokens and IDs
4. Test each endpoint

## 📖 Detailed Documentation

- **[BACKEND_SETUP.md](./BACKEND_SETUP.md)** - Complete API reference, models, and examples
- **[MONGODB_SETUP.md](./MONGODB_SETUP.md)** - Step-by-step MongoDB Atlas setup guide
- **[.env.example](./.env.example)** - Environment variables template

## 🔧 Frontend Integration

Your frontend components need to be updated to use the new API. Here's a template for API calls:

```typescript
// Example: Login API call
const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Save token to localStorage
    localStorage.setItem('token', data.token);
    return data.user;
  } else {
    throw new Error(data.error);
  }
};

// Example: Get designs with auth
const getDesigns = async (token: string) => {
  const response = await fetch('/api/designs', {
    headers: { 
      'Authorization': `Bearer ${token}` 
    },
  });
  return response.json();
};
```

## 💾 Database Collections

Your MongoDB database automatically creates these collections:

### `users` Collection
Stores user account information with hashed passwords

### `designs` Collection
Stores furniture designs with room specifications and furniture items

### `sessions` Collection
Stores active authentication sessions (auto-cleanup after 7 days)

View data in MongoDB Atlas → Collections → Browse Collections

## 🛠️ Useful Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Check for TypeScript errors
npm run build

# Install dependencies
npm install
```

## 📝 Key Endpoints Reference

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/register` | ❌ | Create new user |
| POST | `/api/auth/login` | ❌ | Login user |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/change-password` | ✅ | Change password |
| GET | `/api/profile` | ✅ | Get user profile |
| PUT | `/api/profile` | ✅ | Update profile |
| GET | `/api/designs` | ❌ | Get all designs |
| POST | `/api/designs` | ✅ | Create design |
| GET | `/api/designs/[id]` | ❌ | Get specific design |
| PUT | `/api/designs/[id]` | ✅ | Update design |
| DELETE | `/api/designs/[id]` | ✅ | Delete design |

## ⚠️ Common Issues & Solutions

### Issue: "Cannot connect to MongoDB"
**Solution**: Check your `MONGODB_URI` in `.env.local`. Make sure:
- Connection string is correct
- IP is whitelisted in MongoDB Atlas
- Database user has proper permissions

### Issue: "ENOENT: no such file or directory, open '.env.local'"
**Solution**: Create `.env.local` file in the root directory with MongoDB URI

### Issue: "JWT_SECRET is not set"
**Solution**: Add `JWT_SECRET` to your `.env.local` file

### Issue: TypeScript "Cannot find module" errors
**Solution**: Run `npm install` to install all dependencies

## 🚀 Next Steps

1. ✅ Backend setup complete
2. → Update your frontend components to use the new API endpoints
3. → Test all endpoints with the REST client
4. → Deploy to production (Vercel, Railway, Heroku, etc.)

## 📞 Support Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Guide](https://mongoosejs.com/docs/guide.html)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [JWT.io](https://jwt.io/) - JWT debugger

## ✨ What You Have Now

Your project includes a **production-ready backend** with:

- ✅ Full user authentication system
- ✅ Design/project management
- ✅ Secure password handling
- ✅ Session management
- ✅ Authorization/permission checking
- ✅ MongoDB persistence
- ✅ TypeScript type safety
- ✅ Comprehensive error handling

**You're ready to build awesome furniture design applications!** 🎉
