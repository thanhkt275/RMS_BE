# Cross-Domain Authentication Fix - Test Guide

## Problem Solved
✅ **Root Cause**: Cross-domain cookie restrictions between frontend (`rms-fe-nu.vercel.app`) and backend
✅ **Solution**: Hybrid approach using Authorization header with localStorage + cookie fallback

## Changes Made

### Backend Changes:
1. **JWT Strategy**: Now supports both Authorization header (primary) and cookies (fallback)
2. **Login Endpoint**: Returns `access_token` in response body
3. **Debug Endpoints**: Added `/debug-headers` to verify token transmission

### Frontend Changes:
1. **API Client**: Automatically adds Authorization header when token exists in localStorage
2. **Auth Service**: Stores token in localStorage on login, clears on logout
3. **Interface**: Updated `IAuthResponse` to include `access_token`

## Testing Steps

### 1. Test in Development (localhost)
```bash
# Should work with both cookies and Authorization header
1. Login -> Check localStorage for token
2. Navigate to protected page -> Should work
3. Check Network tab -> Should see Authorization header in requests
```

### 2. Test in Production
```bash
# Should work with Authorization header
1. Login -> Check localStorage for token
2. Navigate to protected page -> Should work now!
3. Check Network tab -> Should see Authorization header
```

### 3. Debug Endpoints
```bash
# Check what the backend receives
GET /api/auth/debug-headers
# Should show both authorization header and cookie

GET /api/auth/debug-cookies  
# Should show cookies (if same domain) or empty (if cross-domain)
```

## How It Works Now

### Login Flow:
1. User submits credentials
2. Backend validates and returns JWT in response body
3. Frontend stores JWT in localStorage
4. All subsequent requests include `Authorization: Bearer <token>` header

### Protected Route Access:
1. Middleware checks for token (either cookie or Authorization header)
2. Backend JWT strategy extracts token from either source
3. Token is validated and user is authenticated
4. Access granted to protected routes

## Advantages of This Approach:

✅ **Cross-Domain Compatible**: Works across different domains  
✅ **Backward Compatible**: Still supports cookies for same-domain  
✅ **Standard Compliance**: Uses standard Authorization header  
✅ **Secure**: JWT tokens are properly validated  
✅ **Reliable**: Not affected by browser cookie policies  

## Environment Variables Required:

### Backend (.env.production):
```bash
JWT_SECRET="your-secret-key"
FRONTEND_URL="https://rms-fe-nu.vercel.app"
NODE_ENV="production"
```

### Frontend (.env.production):
```bash
NEXT_PUBLIC_API_URL="https://your-backend-domain.com/api"
JWT_SECRET="same-secret-as-backend"
NODE_ENV="production"
```

## Expected Results:

- ✅ Login works in production
- ✅ Protected pages accessible after login
- ✅ Token stored in localStorage
- ✅ Authorization header sent with requests
- ✅ No more 401 errors on protected routes

This solution resolves the cross-domain authentication issue while maintaining security and compatibility.
