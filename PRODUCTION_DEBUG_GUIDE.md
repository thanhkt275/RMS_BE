# Production Authentication Debug Guide

## Current Issue Analysis
You're experiencing a cross-domain cookie issue where:
- Frontend: `https://rms-fe-nu.vercel.app`
- Backend: (different domain)
- Cookie is not being sent from frontend to backend

## Debug Steps

### 1. Test Cookie Configuration
First, test what cookies are actually being set:

```bash
# In your frontend, make a request to:
POST /api/auth/login-debug
# This will show detailed cookie and request information

# Then check what cookies are received:
GET /api/auth/read-cookies
```

### 2. Check Browser Developer Tools
1. Open browser Developer Tools (F12)
2. Go to Application → Cookies
3. Check if the `token` cookie is being set after login
4. Check the cookie's domain, secure, sameSite settings

### 3. Test Different Cookie Strategies
Use the test endpoint to see which cookie configuration works:

```bash
GET /api/auth/test-cookie
# This sets multiple test cookies with different configurations
# Then check which ones are received back
```

## Common Solutions

### Solution 1: Use Credentials in Frontend
Ensure your frontend API calls include credentials:

```javascript
// In your frontend authService
fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include', // This is crucial!
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(loginData)
});
```

### Solution 2: Alternative Authentication Method
If cookies continue to fail, use Authorization header instead:

**Backend Changes:**
```typescript
// In jwt.strategy.ts, update jwtFromRequest:
jwtFromRequest: ExtractJwt.fromExtractors([
  ExtractJwt.fromAuthHeaderAsBearerToken(), // Header method
  (req: Request) => req?.cookies?.token,    // Cookie method (fallback)
]),
```

**Frontend Changes:**
```javascript
// Store token in localStorage and send in header
localStorage.setItem('token', token);

// In API calls:
const token = localStorage.getItem('token');
fetch('/api/auth/check-auth', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Solution 3: Same-Domain Setup
If possible, serve both frontend and backend from the same domain:
- Frontend: `https://yourdomain.com`
- Backend: `https://yourdomain.com/api`

## Environment Variables to Add

Add these to your production backend:

```bash
# Optional: Set if you want to restrict cookie domain
COOKIE_DOMAIN=.yourdomain.com

# Ensure this matches your actual frontend URL
FRONTEND_URL=https://rms-fe-nu.vercel.app
```

## Quick Test Commands

1. **Test Environment:**
```bash
curl https://your-backend-domain.com/api/auth/debug-env
```

2. **Test Cookie Setting:**
```bash
curl -c cookies.txt https://your-backend-domain.com/api/auth/test-cookie
```

3. **Test Cookie Reading:**
```bash
curl -b cookies.txt https://your-backend-domain.com/api/auth/read-cookies
```

## Expected Behavior vs Current

**Expected:** 
- Login sets cookie
- Subsequent requests include cookie
- Backend reads cookie and authenticates user

**Current:**
- Login sets cookie ✓
- Frontend doesn't send cookie to backend ✗
- Backend receives no token ✗

## Next Steps

1. Try the debug endpoints to see exact cookie behavior
2. Check if frontend is sending `credentials: 'include'`
3. Consider switching to Authorization header method if cross-domain cookies continue to fail
4. Verify CORS settings match your actual domains

The most likely solution is ensuring your frontend uses `credentials: 'include'` in all API calls, or switching to the Authorization header method which is more reliable for cross-domain scenarios.
