# Production Deployment Configuration Guide

## Environment Variables for Production

Create these environment variables in your production environment (replace with your actual values):

```bash
# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-key-here"

# Database
DATABASE_URL="your-production-database-url"

# Frontend URL (IMPORTANT: Must match your actual frontend domain)
FRONTEND_URL="https://your-production-frontend-domain.com"

# Admin Configuration
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-secure-admin-password"

# Cookie Domain (optional, for subdomain cookies)
COOKIE_DOMAIN=".yourdomain.com"

# Environment
NODE_ENV="production"

# Port (optional)
PORT=5000
```

## Frontend Environment Variables

Create a `.env.production` file in your frontend project:

```bash
# Frontend Production Environment Variables
NEXT_PUBLIC_BACKEND_URL="https://your-backend-domain.com"
NEXT_PUBLIC_API_URL="https://your-backend-domain.com/api"
NEXT_PUBLIC_WS_URL="https://your-backend-domain.com"

# JWT Secret (should match backend)
JWT_SECRET="your-same-jwt-secret-as-backend"

# Environment
NODE_ENV="production"
```

## Key Configuration Changes Made

### 1. Cookie Settings
- Changed `sameSite` from `'strict'` to `'none'` in production for cross-origin requests
- Added support for `COOKIE_DOMAIN` environment variable
- Ensured secure cookies are enabled in production

### 2. CORS Configuration
- Added support for multiple origins
- Added `Cookie` to allowed headers
- Added `Set-Cookie` to exposed headers
- Properly configured for production vs development

### 3. Environment Variables
- Removed spaces from environment variable assignments
- Added missing `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- Updated `FRONTEND_URL` to use HTTPS for production

## Debugging Steps

1. **Check Environment Variables**
   ```bash
   GET /api/auth/debug-env
   ```

2. **Check Cookie/Header Issues**
   ```bash
   GET /api/auth/debug-cookies
   ```

3. **Test Admin Creation**
   ```bash
   GET /api/auth/force-recreate-admin
   ```

## Root Cause Analysis

The issue was that the **frontend middleware was trying to read cookies set by the backend**, but cookies are domain-specific. Here's what was happening:

1. **Backend** (API domain) correctly sets the authentication cookie ✅
2. **Frontend middleware** (runs on frontend domain) tries to read backend cookies ❌
3. **Frontend to Backend API calls** correctly send the cookie ✅

## Solution Applied

**Fixed Frontend Middleware Approach:**
- Instead of reading cookies directly, the middleware now makes an API call to `/api/auth/check-auth`
- This leverages the existing working cookie mechanism
- The API call includes `credentials: 'include'` to send cookies automatically

## Frontend Configuration

Make sure your frontend is configured to:

1. **Use credentials in API calls**
   ```javascript
   fetch('/api/auth/login', {
     method: 'POST',
     credentials: 'include', // Important!
     headers: {
       'Content-Type': 'application/json'
     },
     body: JSON.stringify(credentials)
   });
   ```

2. **Set correct API URL**
   ```javascript
   const API_URL = process.env.NODE_ENV === 'production' 
     ? 'https://your-backend-domain.com/api'
     : 'http://localhost:5000/api';
   ```

## Common Production Issues and Solutions

### Issue: 401 Unauthorized
- **Cause**: JWT_SECRET mismatch or missing
- **Solution**: Ensure JWT_SECRET is set identically in both environments

### Issue: CORS Errors
- **Cause**: Frontend URL doesn't match CORS configuration
- **Solution**: Update FRONTEND_URL to match your production domain

### Issue: Cookies not sent
- **Cause**: sameSite or secure settings
- **Solution**: Use `sameSite: 'none'` and `secure: true` for production

### Issue: Admin role not working
- **Cause**: Admin user not created or password mismatch
- **Solution**: Use `/api/auth/force-recreate-admin` endpoint

## Deployment Checklist

- [ ] All environment variables are set correctly
- [ ] FRONTEND_URL matches your actual frontend domain
- [ ] JWT_SECRET is set to a secure value
- [ ] Database connection is working
- [ ] Admin user is created with correct credentials
- [ ] CORS is configured for your production domain
- [ ] Cookies are working with your domain setup
- [ ] HTTPS is properly configured
