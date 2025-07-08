# Cursor Active Users Bot - Agent Guide

## Commands

- **Build**: `npm run build` - Compile TypeScript to JavaScript
- **Test**: `npm test` - Run Jest tests (single test: `npm test -- --testNamePattern="test name"`)
- **Lint**: `npm run lint:fix` - **ONLY** command allowed for fixing linting issues
- **Format**: `npm run format` - Format code with Biome
- **Check**: `npm run check` - Run all checks (lint + format)
- **Dev**: `npm run dev` - Start local development server with auto-restart
- **CDK**: `npx cdk diff` (review changes), `npx cdk synth` (synthesize), `npx cdk deploy`

## Architecture

### Core Components

- **AWS Lambda**: Scheduled function in `src/lambda/index.ts` (weekly execution)
- **Multi-service Operations**:
  - `src/services/cursor-operations.ts` - Cursor IDE monitoring
  - `src/services/github-operations.ts` - GitHub Copilot monitoring
- **APIs**:
  - `src/apis/cursor-admin-api.ts` - Cursor Admin API integration
  - `src/apis/github-api.ts` - GitHub Copilot API integration
  - `src/apis/slack-api.ts` - Slack notifications with user lookup
- **CDK Infrastructure**: `lib/cursor-active-users-bot-stack.ts`
- **Local Dev**: `src/server/local-server.ts` with separate endpoints for each service
- **Utilities**:
  - `src/utils/env.ts` - Environment configuration with Zod validation
  - `src/utils/secrets.ts` - AWS Secrets Manager integration
  - `src/utils/dates.ts` - Date utilities for usage data ranges

### Configuration

- **Environment Variables**: Zod-validated configuration in `src/utils/env.ts`
- **Secrets Management**: AWS Secrets Manager for API keys and tokens
- **Service Toggles**: Independent enable/disable for Cursor and GitHub Copilot
- **Notification Levels**: Configurable warning and removal thresholds

## Code Style

- **TypeScript**: Strict mode enabled, proper interfaces for API responses
- **Formatting**: Biome with tabs (width 2), 120 char line width, double quotes, trailing commas
- **Imports**: Organized imports enabled
- **Error Handling**: Structured logging with JSON.stringify for objects
- **Testing**: Jest with ts-jest, comprehensive mocking of external APIs
- **Service Pattern**: Business logic in services/, lambda orchestrates services
- **Validation**: Zod schemas for environment variables and secrets

## Services Architecture

### CursorOperations (`src/services/cursor-operations.ts`)

- Fetches team members from Cursor Admin API
- Retrieves daily usage data for configurable time periods
- Categorizes users into notification and removal candidates
- Sends service-specific Slack notifications

### GitHubOperations (`src/services/github-operations.ts`)

- Fetches Copilot seat assignments from GitHub API
- Analyzes last activity dates for inactive users
- Categorizes users based on activity thresholds
- Sends GitHub Copilot-specific notifications

### SlackApi (`src/apis/slack-api.ts`)

- User lookup by email with caching
- Multi-level notifications (DMs and channel messages)
- Service-specific message formatting
- @mention integration for found users

## Local Development

### Available Endpoints

- `GET /` - Server information and available endpoints
- `GET /health` - Health check endpoint
- `POST /check-cursor` - Test Cursor inactive users check
- `POST /check-github` - Test GitHub Copilot inactive users check

### Environment Setup

- **Local**: Environment variables in `.env` file
- **AWS**: Secrets in AWS Secrets Manager
- **Configuration**: Zod validation ensures type safety

## Testing Strategy

### Test Structure

- **APIs** (`tests/apis/`) - Mock HTTP requests and validate API interactions
- **Services** (`tests/services/`) - Test business logic for user categorization
- **Infrastructure** (`tests/infrastructure/`) - Test CDK stack configuration

### Testing Principles

- **Never mutate `process.env`** in tests - use mocks or pass values directly
- **Mock all external APIs** (Slack, Cursor, GitHub, AWS) in tests
- **Use dependency injection** for testability
- **Test both success and error scenarios**
- **Validate proper error handling and logging**

## Critical Rules

### Linting Workflow

- **ALWAYS** run `npm run lint:fix` after code changes (only allowed linting command)
- **NEVER** attempt manual linting fixes without running this command first
- **STOP** if errors remain after `npm run lint:fix` - leave for user

### Development Workflow

1. Make code changes
2. **IMMEDIATELY** run `npm run lint:fix`
3. Run `npm test` to ensure tests pass
4. Build with `npm run build`
5. Deploy with CDK commands

### Testing Requirements

- **Mock external dependencies** (APIs, AWS services)
- **Test service-specific logic** independently
- **Use proper TypeScript types** for all test data
- **Validate error scenarios** and edge cases

## Environment Variables

### Required for Lambda

- `SECRETS_ARN` - AWS Secrets Manager ARN
- `NOTIFY_AFTER_DAYS` - Days before warning DMs (default: 60)
- `REMOVE_AFTER_DAYS` - Days before removal notifications (default: 90)
- `ENABLE_CURSOR` - Enable Cursor monitoring (default: true)
- `ENABLE_GITHUB_COPILOT` - Enable GitHub Copilot monitoring (default: true)
- `ENABLE_SLACK_NOTIFICATIONS` - Enable Slack notifications (default: true)

### Required Secrets

- `CURSOR_API_KEY` - Cursor Admin API key
- `GITHUB_TOKEN` - GitHub personal access token
- `GITHUB_ORG` - GitHub organization name
- `SLACK_BOT_TOKEN` - Slack bot token
- `SLACK_USER_ID` - Slack user ID for notifications
- `SLACK_SIGNING_SECRET` - Slack app signing secret

## Deployment

### CDK Stack Features

- **Lambda Function**: Node.js 22.x runtime, 5-minute timeout, 512MB memory
- **EventBridge Rule**: Weekly execution on Mondays at 9:00 AM UTC
- **Secrets Manager**: Secure API key storage
- **IAM Roles**: Least privilege access for Lambda

### Deployment Commands

```bash
# Review changes
npx cdk diff

# Deploy stack
npx cdk deploy

# Destroy stack
npx cdk destroy
```

## Error Handling

### Logging Standards

- Use structured logging with JSON.stringify for objects
- Log service-specific operations separately
- Include context in error messages
- Use console.warn for recoverable issues, console.error for failures

### Service Isolation

- Each service handles its own errors independently
- Failed services don't prevent other services from running
- Configuration errors are caught early with Zod validation

## Performance Considerations

- **Concurrent Processing**: Services can run simultaneously
- **API Rate Limiting**: Implement proper retry logic
- **Memory Usage**: 512MB Lambda memory for handling larger teams
- **Timeout**: 5-minute timeout for API calls and processing
