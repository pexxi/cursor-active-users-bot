# Testing Environment Variables - Best Practices

## ⚠️ DO NOT MUTATE `process.env` IN TESTS

This document outlines the proper way to handle environment variables in tests without causing side effects.

## The Problem

Direct mutation of `process.env` in tests can cause:

- **Flaky tests**: Tests that pass/fail depending on execution order
- **Side effects**: One test affecting another test's environment
- **Difficult debugging**: Hard to track down which test changed what
- **CI/CD issues**: Tests behaving differently in different environments

## ❌ What NOT to Do

```typescript
// BAD: Direct mutation of process.env
describe('My Test', () => {
  beforeEach(() => {
    process.env.MY_VARIABLE = 'test-value';  // ❌ DON'T DO THIS
    delete process.env.OTHER_VARIABLE;       // ❌ DON'T DO THIS
  });
});
```

## ✅ What TO Do

### Method 1: Pass Values Directly to Constructor/Function

```typescript
// GOOD: Pass environment values directly
describe('CDK Stack Tests', () => {
  it('should create stack with specific environment', () => {
    const mockEnv = {
      AWS_ACCOUNT: '123456789012',
      AWS_REGION: 'us-east-1'
    };

    const app = new cdk.App();
    const stack = new MyStack(app, 'TestStack', {
      env: {
        account: mockEnv.AWS_ACCOUNT,
        region: mockEnv.AWS_REGION,
      }
    });

    expect(stack.account).toBe(mockEnv.AWS_ACCOUNT);
  });
});
```

### Method 2: Local Environment Object Replacement

```typescript
// GOOD: Replace process.env temporarily and locally
describe('Environment-dependent Tests', () => {
  it('should handle missing environment variables', () => {
    const originalProcessEnv = process.env;
    const { AWS_ACCOUNT, ...envWithoutAccount } = originalProcessEnv;
    const mockProcessEnv = { ...envWithoutAccount, AWS_REGION: 'us-east-1' };
    
    // Temporarily replace process.env for this test only
    Object.defineProperty(process, 'env', {
      value: mockProcessEnv,
      configurable: true
    });

    expect(() => {
      new MyStack(new cdk.App(), 'TestStack');
    }).toThrow('Missing AWS_ACCOUNT');

    // Restore original process.env
    Object.defineProperty(process, 'env', {
      value: originalProcessEnv,
      configurable: true
    });
  });
});
```

### Method 3: Mock the Module/Service

```typescript
// GOOD: Mock the service that uses environment variables
jest.mock('../src/config', () => ({
  getConfig: jest.fn(() => ({
    awsAccount: '123456789012',
    awsRegion: 'us-east-1'
  }))
}));

describe('Config-dependent Tests', () => {
  it('should use mocked config', () => {
    const config = getConfig();
    expect(config.awsAccount).toBe('123456789012');
  });
});
```

### Method 4: Use Jest Environment Setup

```typescript
// GOOD: Set up test-specific environment in beforeEach/beforeAll with proper cleanup
describe('My Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Don't mutate, just save reference for restoration
    jest.resetModules(); // Clear any cached modules
  });

  afterEach(() => {
    // Always restore the original environment
    process.env = originalEnv;
  });

  it('should work with clean environment', () => {
    // Test logic here - use method 1 or 2 above for actual env changes
  });
});
```

## ESLint Rule Protection

We have implemented a custom ESLint rule (`local-rules/no-process-env-mutation`) that will catch and prevent:

- `process.env.VARIABLE = 'value'` ❌
- `delete process.env.VARIABLE` ❌  
- `process.env = { ...newEnv }` ❌

The rule only applies to test files (`.test.ts`, `.spec.ts`, files in `/tests/` directories).

## Infrastructure Tests Example

Our infrastructure tests demonstrate the correct pattern:

```typescript
// tests/infrastructure/cursor-active-users-bot-stack.test.ts
const mockEnv = {
  AWS_ACCOUNT: '123456789012',
  AWS_REGION: 'us-east-1'
};

describe('Infrastructure Tests', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = { ...process.env };
    
    // Pass environment directly to stack constructor
    app = new cdk.App();
    stack = new CursorActiveUsersBotStack(app, 'TestStack', {
      env: {
        account: mockEnv.AWS_ACCOUNT,  // ✅ Direct value
        region: mockEnv.AWS_REGION,   // ✅ Direct value
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv; // Cleanup (though we shouldn't have mutated)
  });
});
```

## Summary

1. **Never directly mutate `process.env` in tests**
2. **Pass values directly to constructors/functions when possible**
3. **Use local environment object replacement for complex cases**
4. **Always restore the original environment in cleanup**
5. **The ESLint rule will catch violations automatically**

Following these patterns ensures:

- ✅ Tests are isolated and don't affect each other
- ✅ Tests are predictable and repeatable
- ✅ No side effects between test runs
- ✅ Better debugging experience
- ✅ Consistent behavior across environments
