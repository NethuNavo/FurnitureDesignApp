# MongoDB Atlas Setup Guide

Follow these steps to set up MongoDB Atlas for your project:

## Step 1: Create MongoDB Atlas Account

1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Sign Up" or "Sign In"
3. Create a free account with your email or Google/GitHub account
4. Verify your email address

## Step 2: Create a Project

1. After login, you'll see the "Organizations" page
2. Click "Create New Project"
3. Name your project (e.g., "Furnivision")
4. Click "Create Project"

## Step 3: Create a Cluster

1. Click "Create" to build a database
2. Select "M0 Free" (free tier) - perfect for development
3. Choose your cloud provider (AWS, Google Cloud, or Azure)
4. Select a region close to you
5. Click "Create Cluster"
6. Wait for the cluster to initialize (2-3 minutes)

## Step 4: Create Database User

1. In the left sidebar, go to "Security" > "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication method
4. Enter a username (e.g., "furnivision_user")
5. Generate a secure password (or enter your own)
6. Save this username and password securely
7. Click "Add User"

## Step 5: Configure Network Access

1. Go to "Security" > "Network Access"
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your server's IP address
5. Click "Confirm"

## Step 6: Connect to Your Database

1. Go to "Deployments" > "Database"
2. Click "Connect" button next to your cluster
3. Select "Drivers" connection method
4. Choose "Node.js" as the driver
5. Copy the connection string
6. It should look like:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 7: Update Your Project

1. Open `.env.local` in your project root
2. Replace the connection string:
   ```env
   MONGODB_URI=mongodb+srv://furnivision_user:your_password@cluster0.xxxxx.mongodb.net/furnivision?retryWrites=true&w=majority
   MONGODB_DB=furnivision
   ```
3. Make sure to replace `username`, `password`, and `cluster0.xxxxx` with your actual values

## Step 8: Test the Connection

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```
2. Try registering a new user by accessing your frontend
3. Check MongoDB Atlas to verify data is saved:
   - Go to "Deployments" > "Database"
   - Click "Browse Collections"
   - You should see your database with collections: users, designs, sessions

## MongoDB Atlas Free Tier Limits

- **Storage**: 512 MB
- **Data Transfer**: Shared
- **Connections**: Shared
- **Suitable for**: Development, testing, small projects

## Upgrading the Tier

When your project grows:

1. Go to "Deployments" > "Database"
2. Click the cluster settings (three dots menu)
3. Click "Change Cluster Tier"
4. Select M2 (0.5 GB), M5 (2.5 GB), or higher
5. Follow the upgrade process

## MongoDB Local Setup (Alternative)

If you prefer to run MongoDB locally for development:

### Using Docker (Recommended)

```bash
# Pull MongoDB image
docker pull mongo

# Run MongoDB container
docker run -d \
  --name furnivision-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest
```

Update `.env.local`:
```env
MONGODB_URI=mongodb://admin:password@localhost:27017/?authSource=admin
MONGODB_DB=furnivision
```

### Manual Installation

1. Download MongoDB from [mongodb.com/download/community](https://www.mongodb.com/try/download/community)
2. Install it following the platform-specific instructions
3. MongoDB will run on `localhost:27017` by default
4. Update `.env.local`:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB=furnivision
   ```

## Useful MongoDB Atlas Features

### Collections Browser
- See all your data in real-time
- Export/import data
- Individual document editing

### Performance Advisor
- Monitor database performance
- Get optimization suggestions

### Automated Backups
- Free backups every 6 hours
- Automatic 7-day retention

### Database Tools
- Full-text search
- Real-time sync (Enterprise)
- Charts for data visualization

## Common Issues

### Connection Timeout
- Check if your IP is whitelisted in Network Access
- Verify the connection string in `.env.local`
- Test connectivity with MongoDB Compass (desktop app)

### Authentication Failed
- Verify username and password are correct
- Check if the user has permissions for the database
- Try recreating the database user

### Database Not Found
- MongoDB creates DBs automatically on first write
- Don't create databases manually through UI
- Connect your app and data will be created

## Next Steps

1. Your MongoDB is now set up!
2. Start your development server: `npm run dev`
3. Create a user account through your frontend
4. Check MongoDB Atlas to see your data
5. Read [BACKEND_SETUP.md](./BACKEND_SETUP.md) for detailed API documentation

## Need Help?

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Node.js Driver Docs](https://www.mongodb.com/docs/drivers/node/)
- [Mongoose Documentation](https://mongoosejs.com/)
