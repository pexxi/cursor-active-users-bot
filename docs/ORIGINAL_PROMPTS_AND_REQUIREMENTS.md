# Original Prompts and Requirements - Cursor Active Users Bot

> **Note**: This document reconstructs the likely original prompts and requirements based on the existing project documentation, implementation, and git history. Since I don't have access to past chat logs, this is derived from analyzing the codebase, documentation, and commit messages.

## 📋 Initial Project Requirements (Reconstructed)

### Core Problem Statement

*Likely original prompt:*
> "I need a system to monitor Cursor IDE usage within our team and automatically notify us about inactive users so we can manage licenses efficiently."

### Primary Features Requested

#### 1. **Cursor Usage Monitoring**

- Connect to Cursor Admin API to fetch team members
- Retrieve daily usage data for configurable time periods
- Identify users who haven't been active in Cursor

#### 2. **Slack Integration**

- Send notifications to Slack about inactive users
- Look up Slack usernames by email addresses for better notifications
- Include @username mentions in messages for better visibility

#### 3. **AWS Infrastructure**

- Deploy as AWS Lambda function
- Use AWS Secrets Manager for secure credential storage
- Schedule automatic execution (initially monthly, later changed to weekly)

#### 4. **Development Requirements**

- TypeScript implementation with strict typing
- Comprehensive unit testing with 100% coverage
- Local development server for testing
- Clean service-based architecture

## 🏗️ Architecture Requirements (Reconstructed)

### Service Layer Pattern

*Original guidance likely included:*
> "Keep business logic separated into individual services with single responsibilities. The Lambda handler should only orchestrate these services."

### Required Services

- **CursorAdminApi** - Handle Cursor API interactions
- **SlackApi** - Manage Slack notifications and user lookups
- **InactiveUsersAnalyzer** - Business logic for identifying inactive users

### Testing Requirements

- Mock all external API calls (Slack, Cursor, AWS)
- Test both success and failure scenarios
- Use proper TypeScript interfaces for API responses
- Never mutate `process.env` in tests

## 📅 Evolution of Requirements

### Phase 1: Basic Implementation

*Initial prompt likely focused on:*

- Monthly scheduled checks
- Simple Slack notifications
- Basic inactive user identification
- AWS Lambda deployment with CDK

### Phase 2: Enhanced Notifications (Issue #2)

*Enhancement request reconstructed:*
> "We need to improve the notification system:
>
> - Send individual DM warnings to users who haven't used Cursor for 60+ days
> - Create a removal candidates list for users inactive 90+ days
> - Change from monthly to weekly checks
> - Make time periods configurable
> - Admin should always get the removal list even if DMs fail"

## 🔧 Technical Specifications (Reconstructed)

### Environment and Configuration

*Requirements likely specified:*

- Node.js 18+ for development, Node.js 22.x runtime for Lambda
- TypeScript with strict configuration
- Biome for linting and formatting (specific requirement: only use `npm run lint:fix`)
- Jest for testing with comprehensive coverage

### API Integration Requirements

- **Cursor Admin API**: Fetch team members with "member" role only
- **Slack API**: Required scopes: `chat:write`, `users:read.email`
- **AWS Services**: Secrets Manager, Lambda, EventBridge

### Security Requirements

- Never commit secrets to git
- Use AWS Secrets Manager for production
- Environment variables for local development
- Proper error handling and logging

## 📝 Coding Standards (Reconstructed)

### Linting Workflow

*Critical requirement emphasized multiple times:*
> "ALWAYS run `npm run lint:fix` after making code changes. This is the ONLY command allowed for fixing linting issues. If errors remain, STOP and leave them for the user."

### Error Handling

*Requirements for robust error handling:*

- Use structured logging with JSON.stringify for objects
- Handle both success and error scenarios
- Provide meaningful error messages
- Continue execution even if individual operations fail

### Testing Standards

*Strict testing requirements:*

- Test file patterns: `tests/services/*.test.ts`, `tests/infrastructure/*.test.ts`
- Mock all external dependencies
- Never mutate `process.env` in tests
- Use snapshot testing for infrastructure
- Maintain 100% test coverage

## 🚀 Deployment and Operations

### Local Development

*Requirements for local testing:*

- Express server with manual triggers
- Environment variables instead of AWS Secrets Manager
- Configurable time periods for testing
- Health check endpoints

### Production Deployment

*AWS infrastructure requirements:*

- Lambda function with 512MB memory, 5-minute timeout
- EventBridge scheduled rule (weekly, Monday 9 AM UTC)
- Secrets Manager integration
- CloudWatch logging

### Monitoring and Debugging

*Operational requirements:*

- Structured logging for troubleshooting
- CloudWatch integration
- Error tracking and alerting
- Configuration validation

## 📊 Message Format Requirements

### Enhanced Slack Notifications

*Specific formatting requirements:*

- Finnish date format for activity cutoff dates
- User display names with email addresses
- @username mentions when Slack users are found
- Graceful fallback when users aren't found in Slack

### Example Message Format

```text
Inactive Cursor users (no activity since 10.4.2025):
- John Doe (john@example.com, <@U12345678>)
- Jane Smith (jane@example.com, <@U87654321>)
- Bob Wilson (bob@example.com)
```

## 🔄 Implementation Phases

### Phase 1: Core Functionality

- [x] Basic Cursor API integration
- [x] Slack notification system
- [x] AWS Lambda deployment
- [x] Monthly scheduling
- [x] Unit tests and documentation

### Phase 2: Enhanced Notifications

- [x] Individual DM notifications
- [x] Removal candidates list
- [x] Weekly scheduling
- [x] Configurable time periods
- [x] Improved error handling

### Development Guidelines Evolution

- [x] Strict linting workflow
- [x] Testing best practices
- [x] Environment variable handling
- [x] Documentation standards

## 📚 Documentation Requirements

### Comprehensive Documentation

*Requirements for maintainable project:*

- Detailed README with Quick Start guide
- Local development guide with examples
- Implementation summary for features
- Testing environment best practices
- API configuration guides

### Key Documentation Files

- `README.md` - Main project documentation
- `LOCAL_DEVELOPMENT.md` - Development setup guide
- `IMPLEMENTATION_SUMMARY.md` - Feature implementation details
- `docs/TESTING_ENVIRONMENT_VARIABLES.md` - Testing best practices

## 🎯 Success Criteria (Reconstructed)

### Functional Requirements Met

- ✅ Monitors Cursor IDE usage automatically
- ✅ Sends targeted Slack notifications
- ✅ Manages inactive user identification
- ✅ Supports configurable time periods
- ✅ Provides individual and summary notifications

### Technical Requirements Met

- ✅ TypeScript implementation with strict typing
- ✅ 100% unit test coverage
- ✅ AWS serverless architecture
- ✅ Secure secret management
- ✅ Clean service-based architecture
- ✅ Comprehensive documentation

### Operational Requirements Met

- ✅ Automated weekly execution
- ✅ Local development capabilities
- ✅ Robust error handling and logging
- ✅ Easy deployment and configuration
- ✅ Maintainable codebase with clear guidelines

---

*This document represents a reconstruction of the original prompts and requirements based on the implemented solution and project documentation. The actual prompts may have varied, but this captures the essential requirements and evolution of the project.*
