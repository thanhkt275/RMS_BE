# RMS Backend - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Docker Deployment](#docker-deployment)
5. [Manual Deployment](#manual-deployment)
6. [Production Configuration](#production-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **PostgreSQL**: 12.x or higher
- **Memory**: Minimum 512MB RAM
- **Storage**: At least 1GB free space
- **Network**: Port 5000 (or custom) accessible

### Required Software
- **Docker** (optional, for containerized deployment)
- **Git** (for source code management)
- **PM2** (for process management in production)

## Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd RMS_BE
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@host:5432/rms_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"

# Application Configuration
PORT=5000
NODE_ENV="production"

# Admin Account
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="secure-admin-password"

# CORS Configuration
FRONTEND_URL="https://your-frontend-domain.com"

# Optional: Database Connection Pool
DATABASE_POOL_SIZE=10
DATABASE_POOL_TIMEOUT=20

# Optional: Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Optional: Logging
LOG_LEVEL="info"
```

### 4. Generate Prisma Client
```bash
npx prisma generate
```

## Database Setup

### 1. PostgreSQL Installation

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### CentOS/RHEL
```bash
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

### 2. Database Creation
```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE rms_db;
CREATE USER rms_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE rms_db TO rms_user;
ALTER USER rms_user CREATEDB;
\q
```

### 3. Run Migrations
```bash
# Run all migrations
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

### 4. Seed Database (Optional)
```bash
npx prisma db seed
```

## Docker Deployment

### 1. Dockerfile
The project includes a `Dockerfile` optimized for production:

```dockerfile
# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 5000

# Start the application
CMD ["npm", "run", "start:prod"]
```

### 2. Docker Compose
Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://rms_user:password@db:5432/rms_db
      - JWT_SECRET=your-super-secret-jwt-key
      - NODE_ENV=production
      - PORT=5000
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=rms_db
      - POSTGRES_USER=rms_user
      - POSTGRES_PASSWORD=your-secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

### 3. Deploy with Docker
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### 4. Docker Production Deployment
```bash
# Build production image
docker build -t rms-backend:latest .

# Run with environment variables
docker run -d \
  --name rms-backend \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/rms_db" \
  -e JWT_SECRET="your-secret" \
  -e NODE_ENV="production" \
  rms-backend:latest
```

## Manual Deployment

### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib
```

### 2. Application Deployment
```bash
# Clone repository
git clone <repository-url>
cd RMS_BE

# Install dependencies
npm install

# Build application
npm run build

# Set up environment
cp .env.example .env
# Edit .env with production values

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### 3. PM2 Process Management
Create a `ecosystem.config.js` file:

```javascript
module.exports = {
  apps: [{
    name: 'rms-backend',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10
  }]
};
```

### 4. Start Application
```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

# Monitor application
pm2 monit
```

## Production Configuration

### 1. Nginx Reverse Proxy
Create `/etc/nginx/sites-available/rms-backend`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/rms-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Firewall Configuration
```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 4. Database Optimization
```sql
-- Enable connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();
```

## Monitoring & Logging

### 1. Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs rms-backend

# Monitor system resources
htop
```

### 2. Database Monitoring
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 3. Log Rotation
Create `/etc/logrotate.d/rms-backend`:

```
/path/to/rms-backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 4. Health Checks
```bash
# Application health
curl http://localhost:5000/api/health

# Database connectivity
npx prisma db execute --stdin <<< "SELECT 1;"
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U rms_user -d rms_db

# Check logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### 2. Application Startup Issues
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs rms-backend --lines 100

# Restart application
pm2 restart rms-backend
```

#### 3. Memory Issues
```bash
# Check memory usage
free -h

# Monitor Node.js memory
node --max-old-space-size=2048 dist/main.js
```

#### 4. Port Conflicts
```bash
# Check port usage
sudo netstat -tulpn | grep :5000

# Kill process using port
sudo fuser -k 5000/tcp
```

### Performance Optimization

#### 1. Node.js Optimization
```bash
# Increase heap size
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable garbage collection logging
export NODE_OPTIONS="--trace-gc"
```

#### 2. Database Optimization
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_matches_stage_id ON matches(stage_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_users_username ON users(username);
```

#### 3. Caching Strategy
```typescript
// Implement Redis caching for frequently accessed data
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60000, // 1 minute
      max: 100, // maximum number of items in cache
    }),
  ],
})
```

### Backup Strategy

#### 1. Database Backup
```bash
# Create backup script
#!/bin/bash
BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/rms_db_$DATE.sql"

pg_dump -h localhost -U rms_user rms_db > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

#### 2. Application Backup
```bash
# Backup application files
tar -czf /backups/app/rms-backend-$(date +%Y%m%d).tar.gz /path/to/rms-backend

# Backup environment configuration
cp /path/to/rms-backend/.env /backups/config/env-$(date +%Y%m%d).backup
```

### Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT secret
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Regular security updates
- [ ] Database access restrictions
- [ ] Log monitoring
- [ ] Backup strategy
- [ ] Rate limiting enabled
- [ ] CORS properly configured

---

*Last updated: January 2024* 