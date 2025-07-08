# Code Cleanup and Refactoring TODO

## Overview

This document outlines a comprehensive plan to eliminate code duplication, improve maintainability, and follow DRY principles throughout the codebase. The focus is on removing duplication between lambda and server endpoints while creating a more modular, testable architecture.

## Priority 1: Lambda and Server Endpoint Unification

### Current Problems

- **Lambda handler** (`src/lambda/index.ts`) - 233 lines with complex orchestration
- **Server functions** (`src/server/local-server.ts`) - `checkInactiveCursorUsers()` (75 lines) and `checkInactiveGitHubUsers()` (80 lines)
- Massive code duplication for:
  - Environment variable parsing
  - Service initialization
  - Processing orchestration
  - Slack notification handling
  - Error handling patterns

### Phase 1: Create User Processing Orchestrator

- [ ] **Create `src/services/user-processing-orchestrator.ts`**
  - [ ] Define `UserProcessingOrchestrator` class
  - [ ] Add `processAllServices()` method for lambda use case
  - [ ] Add `processCursorUsers()` method for server endpoint
  - [ ] Add `processGitHubUsers()` method for server endpoint
  - [ ] Extract common processing pipeline logic
  - [ ] Handle service initialization and dependency injection
  - [ ] Manage user deduplication across services
  - [ ] Target: ~150-200 lines total

### Phase 2: Extract Configuration Management

- [ ] **Create `src/services/configuration.ts`**
  - [ ] Define `ConfigurationService` class
  - [ ] Extract environment variable parsing from lambda handler
  - [ ] Add validation for required variables per service
  - [ ] Create configuration interfaces for type safety
  - [ ] Add `getServiceConfiguration()` methods
  - [ ] Target: ~80-100 lines

### Phase 3: Create Notification Service

- [ ] **Create `src/services/notification-service.ts`**
  - [ ] Define `NotificationService` class
  - [ ] Extract Slack notification orchestration logic
  - [ ] Add `sendUserNotifications()` method
  - [ ] Add `sendAdminSummary()` method
  - [ ] Handle notification success/failure tracking
  - [ ] Support both enabled/disabled notification modes
  - [ ] Target: ~100-120 lines

### Phase 4: Refactor Lambda Handler

- [ ] **Refactor `src/lambda/index.ts`**
  - [ ] Replace direct service calls with orchestrator
  - [ ] Remove duplicated configuration parsing
  - [ ] Remove duplicated notification logic
  - [ ] Keep lambda-specific error handling
  - [ ] Target: Reduce from 233 lines to ~50-60 lines

### Phase 5: Refactor Server Endpoints

- [ ] **Refactor `src/server/local-server.ts`**
  - [ ] Replace `checkInactiveCursorUsers()` with orchestrator call
  - [ ] Replace `checkInactiveGitHubUsers()` with orchestrator call
  - [ ] Create generic `processService()` helper function
  - [ ] Maintain existing API contract
  - [ ] Target: Reduce each function from 75-80 lines to ~20-30 lines

## Priority 2: Service Provider Abstraction

### Current Problems

- `CursorOperations` and `GitHubOperations` have nearly identical structure
- Duplicate `DateRangeInfo` interface definitions
- Similar processing patterns with different implementations

### Tasks

- [ ] **Create `src/services/interfaces.ts`**
  - [ ] Define `UserServiceProvider` interface
  - [ ] Define common `ServiceResult` interface
  - [ ] Define shared `DateRangeInfo` interface
  - [ ] Define `ProcessingConfiguration` interface

- [ ] **Create `src/services/base-user-service.ts`**
  - [ ] Define abstract `BaseUserService` class
  - [ ] Implement common `getDateRanges()` method
  - [ ] Implement common logging patterns
  - [ ] Define abstract methods for service-specific logic

- [ ] **Refactor `src/services/cursor-operations.ts`**
  - [ ] Extend `BaseUserService`
  - [ ] Remove duplicate `DateRangeInfo` interface
  - [ ] Use shared date range calculation
  - [ ] Target: Reduce from 147 lines to ~100-120 lines

- [ ] **Refactor `src/services/github-operations.ts`**
  - [ ] Extend `BaseUserService`
  - [ ] Remove duplicate `DateRangeInfo` interface
  - [ ] Consolidate inactive user finding logic
  - [ ] Target: Reduce from 174 lines to ~120-140 lines

## Priority 3: Function Decomposition

### Lambda Handler Functions

- [ ] **Split `handler()` in `src/lambda/index.ts`**
  - [ ] Extract `parseConfiguration()` helper
  - [ ] Extract `initializeServices()` helper
  - [ ] Extract `processServices()` helper
  - [ ] Extract `handleNotifications()` helper
  - [ ] Each helper function should be 20-40 lines

### Server Functions

- [ ] **Split `checkInactiveCursorUsers()` in `src/server/local-server.ts`**
  - [ ] Extract `initializeCursorService()` helper
  - [ ] Extract `processNotifications()` helper
  - [ ] Extract `buildResponse()` helper

- [ ] **Split `checkInactiveGitHubUsers()` in `src/server/local-server.ts`**
  - [ ] Extract `initializeGitHubService()` helper
  - [ ] Extract `processNotifications()` helper (shared with Cursor)
  - [ ] Extract `buildResponse()` helper (shared with Cursor)

## Priority 4: Interface and Type Consolidation

### Current Problems

- `DateRangeInfo` interface duplicated across services
- Similar result interfaces with slight variations
- Inconsistent type definitions

### Tasks

- [ ] **Create `src/types/common.ts`**
  - [ ] Move `DateRangeInfo` interface
  - [ ] Define `ServiceProcessingResult` interface
  - [ ] Define `NotificationResult` interface
  - [ ] Define `ConfigurationOptions` interface

- [ ] **Update service imports**
  - [ ] Replace local interface definitions with shared types
  - [ ] Ensure consistent naming conventions
  - [ ] Add proper JSDoc documentation

## Priority 5: Minor Cleanups and Improvements

### API Cleanups

- [ ] **Remove deprecated code in `src/apis/slack-api.ts`**
  - [ ] Remove `sendInactiveUsersNotification()` method (marked deprecated)
  - [ ] Clean up unused imports
  - [ ] Verify all methods are properly used

### Error Handling

- [ ] **Standardize error handling patterns**
  - [ ] Create common error handling utilities
  - [ ] Ensure consistent error logging format
  - [ ] Add proper error recovery mechanisms

### Logging Improvements

- [ ] **Improve logging consistency**
  - [ ] Standardize log message formats
  - [ ] Add structured logging for better debugging
  - [ ] Ensure sensitive data is not logged

### Code Style

- [ ] **Apply consistent coding patterns**
  - [ ] Ensure all functions have proper JSDoc comments
  - [ ] Verify imports are organized consistently
  - [ ] Check adherence to established patterns

## Testing Updates Required

After implementing the changes above, the following test files will need updates:

- [ ] Update `tests/services/cursor-operations.test.ts` for new base class
- [ ] Update `tests/services/github-operations.test.ts` for new base class
- [ ] Create `tests/services/user-processing-orchestrator.test.ts`
- [ ] Create `tests/services/configuration.test.ts`
- [ ] Create `tests/services/notification-service.test.ts`
- [ ] Update integration tests for lambda and server endpoints

## Expected Outcomes

### Quantitative Improvements

- **Lambda handler**: 233 lines → ~50-60 lines (75% reduction)
- **Server functions**: 75-80 lines each → ~20-30 lines each (65% reduction)
- **Overall code duplication**: ~60% reduction in duplicated logic
- **File count**: +5 new service files, better separation of concerns

### Qualitative Improvements

- **Single source of truth** for business logic
- **Improved testability** with isolated, focused functions
- **Enhanced maintainability** through clear abstractions
- **Better readability** with shorter, more focused files
- **Easier extension** for adding new user services

## Implementation Notes

1. **Maintain API compatibility** - All existing endpoints must continue to work
2. **Preserve error handling** - Don't break existing error recovery mechanisms
3. **Keep tests passing** - Update tests incrementally as changes are made
4. **Follow existing patterns** - Maintain consistency with established code style
5. **Document changes** - Update relevant documentation and comments

## Verification Checklist

After implementation, verify:

- [ ] All tests pass
- [ ] Lambda function deploys successfully
- [ ] Local server starts and responds correctly
- [ ] No regression in functionality
- [ ] Code passes linting with `npm run lint:fix`
- [ ] Code formatting is consistent with `npm run format`
