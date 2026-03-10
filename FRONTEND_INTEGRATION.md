# Frontend Integration Guide

This guide explains how to integrate the new MongoDB backend auth system into your frontend components.

## 📚 Quick Reference

### 1. Using Direct API Calls

```typescript
import { login, register, getDesigns, saveToken } from '@/lib/api'

// Register user
const result = await register('John Doe', 'john@example.com', 'Password123')
if (result.error) {
  console.error(result.error)
  return
}
const { token, user } = result.data!
saveToken(token)

// Login user
const loginResult = await login('john@example.com', 'Password123')
if (loginResult.error) {
  console.error(loginResult.error)
  return
}
const token = loginResult.data!.token
saveToken(token)

// Get designs
const designsResult = await getDesigns()
const designs = designsResult.data!.designs
```

### 2. Using the useAuth Hook (Recommended)

```typescript
"use client"
import { useAuth } from '@/lib/hooks/useAuth'

export default function Dashboard() {
  const { user, token, login, logout, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <div>Please log in</div>
  }

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

## 🔐 Authentication Flow

### Register Flow
```
User fills register form
  ↓
Call: register(name, email, password)
  ↓
Backend validates input & creates user
  ↓
Returns: { token, user }
  ↓
Save token: saveToken(token)
  ↓
Redirect to dashboard
```

### Login Flow
```
User fills login form
  ↓
Call: login(email, password)
  ↓
Backend validates credentials
  ↓
Returns: { token, user }
  ↓
Save token: saveToken(token)
  ↓
Redirect to dashboard
```

### Logout Flow
```
User clicks logout button
  ↓
Call: logout(token)
  ↓
Backend invalidates session
  ↓
Clear token: clearToken()
  ↓
Redirect to login
```

## 📝 Component Examples

### Login Component

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login, saveToken } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login(email, password)
    
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    saveToken(result.data!.token)
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Login'}
      </button>
    </form>
  )
}
```

### Register Component

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { register, saveToken } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await register(name, email, password)
    
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    saveToken(result.data!.token)
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full Name"
        required
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Register'}
      </button>
    </form>
  )
}
```

### Dashboard Component with useAuth

```typescript
'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Dashboard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return null
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <p>Email: {user?.email}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}
```

### Design List Component

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { getDesigns, deleteDesign } from '@/lib/api'

export default function DesignsList() {
  const { token, isAuthenticated } = useAuth()
  const [designs, setDesigns] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      fetchDesigns()
    }
  }, [isAuthenticated])

  const fetchDesigns = async () => {
    setIsLoading(true)
    const result = await getDesigns()
    if (result.data) {
      setDesigns(result.data.designs)
    }
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    const result = await deleteDesign(id, token)
    if (!result.error) {
      await fetchDesigns()
    }
  }

  if (isLoading) return <div>Loading designs...</div>

  return (
    <div>
      <h2>Your Designs</h2>
      {designs.length === 0 ? (
        <p>No designs yet</p>
      ) : (
        <ul>
          {designs.map((design: any) => (
            <li key={design._id}>
              <h3>{design.name}</h3>
              <button onClick={() => handleDelete(design._id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

## 🛡️ Protected Route Component

```typescript
'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { ReactNode, useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

// Usage:
// <ProtectedRoute>
//   <Dashboard />
// </ProtectedRoute>
```

## 🔄 API Token Management

### Getting the Token
```typescript
import { getToken } from '@/lib/api'

const token = getToken()
if (token) {
  // User is logged in
}
```

### Saving the Token
```typescript
import { saveToken } from '@/lib/api'

const result = await login(email, password)
if (!result.error) {
  saveToken(result.data!.token)
}
```

### Clearing the Token
```typescript
import { clearToken } from '@/lib/api'

await logout()
clearToken()
```

## ❌ Error Handling

All API calls return an `ApiResponse` object:

```typescript
interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// Usage:
const result = await login(email, password)

if (result.error) {
  // Handle error
  console.error(result.error)
  setErrorMessage(result.error)
  return
}

// Use result.data
const { token, user } = result.data!
```

## 📋 Common Error Messages

| Error | Meaning |
|-------|---------|
| "Please provide a valid email address." | Invalid email format |
| "Password must be at least 8 characters." | Password too short |
| "Email already exists." | Email is already registered |
| "Invalid credentials." | Wrong email or password |
| "No valid token provided." | Token is missing or invalid |
| "Unauthorized: cannot update another user's design." | User doesn't own the design |

## ✅ Checklist for Integration

- [ ] Install API utilities: `import from '@/lib/api'`
- [ ] Install useAuth hook: `import from '@/lib/hooks/useAuth'`
- [ ] Update login component to use new API
- [ ] Update register component to use new API
- [ ] Add logout button to header/nav
- [ ] Update dashboard to show user info
- [ ] Protect routes that require authentication
- [ ] Test all auth flows (register, login, logout)
- [ ] Handle token expiration (7 days)
- [ ] Store token in localStorage
- [ ] Pass token in API requests

## 🚀 Testing

### Manual Testing Steps

1. **Register**
   - Fill out register form
   - Verify account is created in MongoDB

2. **Login**
   - Try existing email/password
   - Verify token is saved to localStorage
   - Verify redirect to dashboard

3. **Dashboard**
   - Verify user info is displayed
   - Verify logout button works

4. **Designs**
   - Create a design
   - View all designs
   - Update a design
   - Delete a design

## 📞 Troubleshooting

### Token not saving
- Check localStorage is enabled in browser
- Check `saveToken()` is being called

### API calls failing
- Check MongoDB connection string in `.env.local`
- Check NEXT_PUBLIC_API_URL is correct
- Check token format in Authorization header

### Unauthorized errors
- Token may have expired (7-day limit)
- Try logging in again
- Check token is being passed in header

## 📚 Additional Resources

- [useAuth Hook](../hooks/useAuth.ts)
- [API Utilities](../api.ts)
- [Backend Setup Guide](../BACKEND_SETUP.md)
- [Input Validation](../app/api/_lib/validation.ts)
