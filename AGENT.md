# Cursor Active Users Bot - Agent Guide

## Commands

- **Build**: `npm run build` - Compile TypeScript to JavaScript
- **Test**: `npm test` - Run Jest tests (single test: `npm test -- --testNamePattern="test name"`)
- **Lint**: `npm run lint:fix` - **ONLY** command allowed for fixing linting issues
- **Format**: `npm run format` - Format code with Biome
- **Dev**: `npm run dev` - Start local development server with auto-restart
- **CDK**: `npx cdk diff` (review changes), `npx cdk synth` (synthesize), `npx cdk deploy`

## Architecture

- **AWS Lambda**: Scheduled function in `src/lambda/index.ts`
- **Services**: `src/services/` - CursorAdminApi, SlackApi, InactiveUsersAnalyzer
- **CDK Infrastructure**: `lib/cursor-active-users-bot-stack.ts`
- **Local Dev**: `src/server/local-server.ts` for testing
- **APIs**: Cursor Admin API, Slack API with user lookup by email
- **Secrets**: AWS Secrets Manager for API keys (CURSOR_API_KEY, SLACK_BOT_TOKEN, etc.)

## Code Style

- **TypeScript**: Strict mode enabled, proper interfaces for API responses
- **Formatting**: Biome with tabs (width 2), 120 char line width, double quotes, trailing commas
- **Imports**: Organized imports enabled
- **Error Handling**: Structured logging with JSON.stringify for objects
- **Testing**: Jest with ts-jest, never mutate process.env directly in tests
- **Service Pattern**: Business logic in services/, lambda only orchestrates

## Critical Rules

- **NEVER** mutate `process.env` in tests - use mocks or pass values directly
- **ALWAYS** run `npm run lint:fix` after code changes (only allowed linting command)
- **ALWAYS** run `npm test` before committing
- Mock all external API calls (Slack, Cursor, AWS) in tests
- Use dependency injection for testability
