# Users Service Caching Strategy

This document outlines the comprehensive caching strategy implemented for the Users Service using Prisma Accelerate.

## Overview

The caching strategy is designed to optimize database performance while maintaining data consistency and freshness based on different access patterns and update frequencies.

## Cache Configuration

### TTL (Time-To-Live) and SWR (Stale-While-Revalidate) Strategy

| Operation | TTL | SWR | Reasoning |
|-----------|-----|-----|-----------|
| **User Lists** (`findAll`) | 10min | 30min | User lists change moderately through CRUD operations |
| **User Count** | 15min | 45min | Counts change less frequently than detailed lists |
| **User Profiles** (`findOne`) | 30min | 1h | Individual profiles change infrequently |
| **User Statistics** (`getUserStats`) | 30min | 1.5h | Role statistics change very infrequently |
| **Search Results** (`searchUsers`) | 5min | 15min | Search results may change frequently |
| **Authentication Data** (`findByUsername`) | 1h | 2h | User credentials rarely change |
| **Existence Checks** (`isUsernameExists`, `isEmailExists`) | 30min | 1h | Existence checks rarely change |
| **Admin Count** (`validateNotLastAdmin`) | 10min | 30min | Critical for security, needs freshness |

## Cache Tags Strategy

### Functional Tags
- `users_list` - All user list queries
- `users_count` - User count queries
- `user_stats` - Statistical data
- `users_search` - Search result caches
- `user_auth` - Authentication-related data
- `user_profiles` - Individual user profile data

### Hierarchical Tags
- `user_{id}` - Specific user data
- `users_role_{role}` - Role-specific queries
- `users_active_{boolean}` - Active/inactive user filtering
- `users_page_{page}_limit_{limit}` - Pagination-specific

### Specific Operation Tags
- `username_exists_{username}` - Username existence checks
- `email_exists_{email}` - Email existence checks
- `user_auth_{username}` - User authentication data
- `admin_count` - Admin user count
- `search_{term}` - Search query results (limited to 10 chars)

## Cache Invalidation Strategy

### Create Operations
**Invalidated Tags:**
- `users_list`
- `users_count` 
- `user_stats`
- `users_role_{role}`

### Update Operations
**Invalidated Tags:**
- `user_{id}` (specific user)
- `user_auth_{username}` (if username changes)
- `users_list`
- `users_search`

### Role Change Operations
**Invalidated Tags:**
- `user_{id}`
- `user_auth_{username}`
- `users_list`
- `user_stats`
- `users_role_{oldRole}`
- `users_role_{newRole}`

### Delete Operations
**Invalidated Tags:**
- `user_{id}`
- `user_auth_{username}`
- `users_list`
- `users_count`
- `user_stats`
- `users_role_{role}`
- `users_search`

### Bulk Operations
**Invalidated Tags:**
- All role-related tags
- List and count tags
- Statistics tags

## Performance Benefits

### Cache Hit Scenarios
1. **TTL Hit**: Fresh data served directly from cache (fastest)
2. **SWR Hit**: Stale data served while refreshing in background (fast)
3. **Cache Miss**: Database query executed (normal speed)

### Expected Performance Improvements
- **User Lists**: 60-80% cache hit rate during normal operations
- **User Profiles**: 70-90% cache hit rate for frequently accessed users
- **Authentication**: 90%+ cache hit rate during active sessions
- **Search Results**: 40-60% cache hit rate for common queries
- **Statistics**: 95%+ cache hit rate due to infrequent changes

## Implementation Details

### PrismaService Enhancements
```typescript
// Extended with Accelerate support
private acceleratedClient = new PrismaClient().$extends(withAccelerate());

// Cache invalidation methods
async invalidateCache(tags: string[]): Promise<void>
async invalidateAllCache(): Promise<void>
```

### UsersService Integration
```typescript
// Using accelerated client for cached queries
this.prisma.accelerated.user.findMany({
  // query options...
  cacheStrategy: {
    ttl: 600,
    swr: 1800,
    tags: ['users_list', 'users_role_admin']
  }
})
```

## Best Practices Implemented

1. **Granular Cache Tags**: Specific tags for targeted invalidation
2. **Hierarchical Tagging**: User-specific and functional groupings
3. **Conservative TTL**: Shorter TTL for critical data (admin counts)
4. **Longer SWR**: Allow stale data serving while refreshing
5. **Graceful Degradation**: Cache failures don't break functionality
6. **Tag Length Limits**: Respect 64-character tag limitations
7. **Alphanumeric Tags**: Only use allowed characters in tags

## Monitoring and Observability

### Cache Performance Metrics
- Cache hit rates by operation type
- Query response times (TTL vs SWR vs MISS)
- Cache invalidation frequency
- Database load reduction

### Logging
- Cache invalidation events
- Cache operation failures (non-blocking)
- Slow query detection (>500ms)

## Environment Considerations

### Development
- Cache disabled or very short TTL for immediate feedback
- Full cache invalidation on schema changes

### Production
- Full caching enabled with documented TTL/SWR values
- Monitoring cache performance and hit rates
- Alerting on cache invalidation rate limits

## Cache Tag Naming Conventions

1. **Functional**: `{entity}_{operation}` (e.g., `users_list`)
2. **Hierarchical**: `{entity}_{field}_{value}` (e.g., `users_role_admin`)
3. **Specific**: `{operation}_{identifier}` (e.g., `user_123`)
4. **Existence**: `{field}_exists_{value}` (e.g., `username_exists_john`)

## Rate Limiting

Prisma Accelerate has rate limits on cache invalidation:
- Tag-based invalidation: Limited per plan
- Full invalidation: 5 times per day per project
- P6003 error code indicates rate limit reached

## Future Optimizations

1. **Dynamic TTL**: Adjust TTL based on operation patterns
2. **Smart Invalidation**: More granular invalidation logic
3. **Cache Warming**: Pre-populate cache for common queries
4. **A/B Testing**: Compare cached vs non-cached performance
5. **Edge Caching**: Leverage CDN for global cache distribution
