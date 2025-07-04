# Artillery Stress Tests for RMS Backend

This directory contains comprehensive Artillery stress test configurations for the RMS (Robot Management System) backend application.

## Test Files

### 1. `artillery-basic.yml`
**Basic Load Test** - Comprehensive test with warm-up, gradual load increase, peak load, and sustained load phases.
- Tests public endpoints and authentication flows
- Gradual ramp-up from 5 to 50 requests per second
- Duration: ~7 minutes total

### 2. `artillery-spike.yml`
**Spike Test** - Tests how the system handles sudden load increases.
- Sudden spike from 10 to 100 requests per second
- Tests system recovery after spike
- Duration: ~2 minutes

### 3. `artillery-soak.yml`
**Soak Test** - Long-running test to identify memory leaks and performance degradation.
- Sustained load of 25 requests per second
- Duration: 10 minutes
- Simulates realistic user behavior patterns

### 4. `artillery-performance.yml`
**Performance Baseline Test** - Establishes performance baselines across different load levels.
- Progressive load increase: 1 → 5 → 10 → 20 RPS
- Comprehensive endpoint coverage
- Duration: 4 minutes

### 5. `artillery-auth.yml`
**Authentication Load Test** - Tests authenticated endpoints and user flows.
- Focuses on protected routes
- Tests JWT token handling under load
- Duration: 2 minutes

## Prerequisites

1. **Start your NestJS backend server:**
   ```bash
   npm run start:dev
   ```

2. **Ensure the server is running on http://localhost:3000**

## Running the Tests

### Individual Test Execution

```bash
# Basic load test
npx artillery run stress-tests/artillery-basic.yml

# Spike test
npx artillery run stress-tests/artillery-spike.yml

# Soak test (long-running)
npx artillery run stress-tests/artillery-soak.yml

# Performance baseline
npx artillery run stress-tests/artillery-performance.yml

# Authentication test
npx artillery run stress-tests/artillery-auth.yml
```

### Generate HTML Reports

```bash
# Run test and generate HTML report
npx artillery run stress-tests/artillery-basic.yml --output basic-test-report.json
npx artillery report basic-test-report.json --output basic-test-report.html
```

### Quick Test (30 seconds)

```bash
# Quick test for immediate feedback
npx artillery quick --duration 30 --rate 10 http://localhost:3000
```

## Test Configuration Options

### Key Metrics to Monitor

- **Response Time**: avg, min, max, p95, p99
- **Request Rate**: requests per second
- **Error Rate**: 4xx, 5xx response codes
- **Throughput**: successful requests per second
- **Virtual Users**: concurrent users

### Phases Explained

- **Warm-up**: Low load to initialize connections
- **Ramp-up**: Gradual load increase
- **Peak**: Maximum load testing
- **Sustained**: Consistent load over time
- **Cool-down**: Gradual load decrease

## Customization

### Environment Variables

Set different target URLs:
```bash
# Test against staging
export TARGET_URL=https://staging.example.com
npx artillery run stress-tests/artillery-basic.yml

# Or modify the config file directly
```

### Authentication Setup

For authenticated tests, ensure you have valid credentials:
- Update username/password in `artillery-auth.yml`
- Create test users in your database
- Configure proper JWT tokens

## Interpreting Results

### Good Performance Indicators
- Response time p95 < 200ms
- Error rate < 1%
- Consistent throughput
- No memory leaks (in soak tests)

### Warning Signs
- Response time p95 > 500ms
- Error rate > 5%
- Declining throughput over time
- Memory usage continuously increasing

## Database Considerations

- Use a test database for stress testing
- Reset database state between tests if needed
- Monitor database connections and query performance
- Consider database connection pooling limits

## System Resource Monitoring

While running tests, monitor:
- CPU usage
- Memory consumption
- Database connections
- Network I/O
- Disk I/O

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure backend server is running
2. **High Error Rates**: Check server logs for errors
3. **Low Throughput**: Verify database performance
4. **Memory Issues**: Monitor for memory leaks

### Debug Mode

Run with verbose output:
```bash
npx artillery run stress-tests/artillery-basic.yml --verbose
```

## Integration with CI/CD

Add to your package.json:
```json
{
  "scripts": {
    "test:stress": "artillery run stress-tests/artillery-basic.yml",
    "test:performance": "artillery run stress-tests/artillery-performance.yml"
  }
}
```

## Advanced Features

### Custom Processors
- Custom JavaScript functions for complex scenarios
- Data generation and manipulation
- Custom metrics and assertions

### Plugins
- artillery-plugin-prometheus: Prometheus metrics
- artillery-plugin-cloudwatch: AWS CloudWatch integration
- artillery-plugin-datadog: Datadog monitoring

## Best Practices

1. **Start Small**: Begin with basic tests before complex scenarios
2. **Monitor Resources**: Watch system resources during tests
3. **Realistic Data**: Use production-like test data
4. **Gradual Scaling**: Increase load gradually
5. **Clean Environment**: Use isolated test environments
6. **Regular Testing**: Run stress tests regularly, not just before releases
