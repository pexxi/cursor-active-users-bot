# Cursor Active Users Bot

A scheduled AWS Lambda function that monitors Cursor IDE and GitHub Copilot usage within your team and sends multi-level Slack notifications about inactive users.

## 🚀 Features

- ✅ **Multi-service support**: Monitor both Cursor IDE and GitHub Copilot usage independently
- ✅ **Flexible configuration**: Enable/disable services independently via environment variables
- ✅ **Multi-level notifications**:
  - **Warning DMs**: Direct messages to users after configurable inactivity period (default: 60 days)
  - **Removal notifications**: Channel notifications for long-term inactive users (default: 90 days)
- ✅ **Cursor IDE monitoring**: Fetches team members and daily usage data from Cursor Admin API
- ✅ **GitHub Copilot monitoring**: Fetches seat assignments and activity data from GitHub API
- ✅ **Smart user lookup**: Finds Slack users by email with @username mentions
- ✅ **Configurable timing**: Separate notification and removal thresholds
- ✅ Secure secret management via AWS Secrets Manager
- ✅ Comprehensive unit tests with high coverage
- ✅ Type-safe implementation with TypeScript
- ✅ Local development server for testing
- ✅ Clean service-based architecture with dependency injection

## 🏗️ Architecture

The application is structured with clean separation of concerns:

### APIs (`src/apis/`)

- **[`CursorAdminApi`](src/apis/cursor-admin-api.ts)** - Handles interactions with the [Cursor Admin API](https://docs.cursor.com/account/teams/admin-api)
- **[`GitHubApi`](src/apis/github-api.ts)** - Handles interactions with the [GitHub Copilot API](https://docs.github.com/en/rest/copilot/copilot-user-management)
- **[`SlackApi`](src/apis/slack-api.ts)** - Manages Slack message sending, user lookup, and multi-level notifications

### Services (`src/services/`)

- **[`CursorOperations`](src/services/cursor-operations.ts)** - Orchestrates Cursor-specific operations and user categorization
- **[`GitHubOperations`](src/services/github-operations.ts)** - Orchestrates GitHub Copilot-specific operations and user categorization

### Lambda Handler (`src/lambda/`)

- **[`handler`](src/lambda/index.ts)** - Main Lambda function that orchestrates the services based on configuration

### Local Development Server (`src/server/`)

- **[`local-server`](src/server/local-server.ts)** - Express server for local development and testing with separate endpoints for each service

### Utilities (`src/utils/`)

- **[`env.ts`](src/utils/env.ts)** - Environment configuration with Zod validation
- **[`secrets.ts`](src/utils/secrets.ts)** - AWS Secrets Manager integration
- **[`dates.ts`](src/utils/dates.ts)** - Date utilities for usage data ranges

## 📋 Prerequisites

- Node.js (v18.x or later recommended, project uses Node.js 22.x runtime for Lambda)
- NPM (comes with Node.js)
- AWS CLI installed and configured with appropriate credentials
- AWS CDK Toolkit installed globally (`npm install -g aws-cdk`)
- A Cursor Admin API Key (if using Cursor monitoring)
- A GitHub Token (if using GitHub Copilot monitoring)
- A Slack App with appropriate permissions

## 🔧 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Create a `.env` file in the root directory:

```env
AWS_ACCOUNT=YOUR_AWS_ACCOUNT_ID_HERE
AWS_REGION=YOUR_AWS_REGION_HERE
```

### 3. Build and Test

```bash
# Build the project
npm run build

# Run tests
npm test

# Run linting (critical step)
npm run lint:fix
```

### 4. Deploy to AWS

```bash
# Bootstrap CDK (first time only)
npx cdk bootstrap aws://YOUR_AWS_ACCOUNT_ID/YOUR_AWS_REGION

# Deploy the stack
npx cdk deploy
```

## 🔐 Configuration

### Environment Variables

The following environment variables can be set to configure the bot:

- `NOTIFY_AFTER_DAYS` - Days before sending warning DMs (default: 60)
- `REMOVE_AFTER_DAYS` - Days before flagging for removal (default: 90)
- `ENABLE_CURSOR` - Enable/disable Cursor monitoring (default: true)
- `ENABLE_GITHUB_COPILOT` - Enable/disable GitHub Copilot monitoring (default: true)
- `ENABLE_SLACK_NOTIFICATIONS` - Enable/disable Slack notifications (default: true)

### AWS Secrets Manager

After deployment, update the `CursorActiveUserBotSecrets` secret in AWS Secrets Manager:

```json
{
  "CURSOR_API_KEY": "key_your_cursor_admin_api_key_here",
  "GITHUB_TOKEN": "your_github_token_here",
  "GITHUB_ORG": "your_github_organization_name",
  "SLACK_BOT_TOKEN": "xoxb-your-slack-bot-token-here",
  "SLACK_SIGNING_SECRET": "your-slack-app-signing-secret-here",
  "SLACK_USER_ID": "U1234567890"
}
```

**Note**: Include only the secrets for the services you plan to enable:

- **Cursor only**: `CURSOR_API_KEY`, `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_USER_ID`
- **GitHub Copilot only**: `GITHUB_TOKEN`, `GITHUB_ORG`, `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_USER_ID`
- **Both services**: All secrets above

### GitHub Token Setup

For GitHub Copilot monitoring, you need a GitHub Personal Access Token or GitHub App token with the following permissions:

- **Organization permissions**: `manage_billing:copilot` or `read:org`
- **Required role**: Organization owner

**To create a Personal Access Token:**

1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Create a new token with access to your organization
3. Grant the required permissions listed above
4. Copy the token and add it to your AWS Secrets Manager

### Slack App Permissions

Your Slack app needs the following scopes:

- `chat:write` - Send messages
- `users:read.email` - Look up users by email address

**To configure:**

1. Go to your Slack app settings
2. Navigate to "OAuth & Permissions" → "Scopes"
3. Add the required bot token scopes
4. Reinstall the app to your workspace

## 💻 Development

### Local Development

For local development and testing, see the detailed [Local Development Guide](LOCAL_DEVELOPMENT.md).

Quick start for local development:

```bash
# Start development server with auto-restart
npm run dev

# Test the Cursor inactive users check
curl -X POST http://localhost:3000/check-cursor

# Test the GitHub Copilot inactive users check
curl -X POST http://localhost:3000/check-github

# Check server health
curl http://localhost:3000/health
```

### Development Workflow

**🚨 CRITICAL: Always run linting after making changes**

```bash
# Make your code changes
# ...

# ALWAYS run this after any changes
npm run lint:fix

# Run tests
npm test

# Build for deployment
npm run build
```

### Available Scripts

- `npm run dev` - Start local development server with auto-restart
- `npm run build` - Compile TypeScript to JavaScript
- `npm run test` - Run all tests with coverage
- `npm run lint` - Check code for linting issues
- `npm run lint:fix` - **CRITICAL**: Fix linting issues (ONLY command allowed for linting)
- `npm run format` - Format code using Biome
- `npm run check` - Run all checks (lint + format)

## 🧪 Testing

The project includes comprehensive unit tests for all services:

- **API tests** (`tests/apis/`) - Mock HTTP requests and validate API interactions
- **Service tests** (`tests/services/`) - Test business logic for user activity analysis
- **Infrastructure tests** (`tests/infrastructure/`) - Test CDK stack configuration

Run tests with coverage:

```bash
npm test

# Run tests in watch mode during development
npm test -- --watch

# Run specific test file
npm test -- cursor-operations.test.ts
```

## 📊 How It Works

1. **Fetch Secrets** - Retrieves API keys from AWS Secrets Manager
2. **Service Processing** - For each enabled service:
   - **Cursor**: Calls Cursor Admin API to get team members and usage data
   - **GitHub Copilot**: Calls GitHub API to get Copilot seat assignments and activity data
3. **Categorize Users** - Identifies users into two categories:
   - **Warning candidates**: Users inactive for `NOTIFY_AFTER_DAYS` (default: 60 days)
   - **Removal candidates**: Users inactive for `REMOVE_AFTER_DAYS` (default: 90 days)
4. **Send Direct Messages** - Sends warning DMs to users who haven't used the service recently
5. **Send Channel Notifications** - Notifies administrators about users who need license removal
6. **Lookup Slack Users** - Finds Slack usernames by email addresses for @mentions

### Service Configuration

The bot supports flexible service configuration via environment variables:

- `ENABLE_CURSOR=true/false` - Enable/disable Cursor monitoring (default: true)
- `ENABLE_GITHUB_COPILOT=true/false` - Enable/disable GitHub Copilot monitoring (default: true)
- `ENABLE_SLACK_NOTIFICATIONS=true/false` - Enable/disable Slack notifications (default: true)

You can run the bot with:

- Only Cursor monitoring
- Only GitHub Copilot monitoring  
- Both services simultaneously
- Notifications disabled for testing

## 💬 Message Format

The bot sends enhanced notifications that include:

- Finnish date format for the activity cutoff date
- User display names with email addresses
- **@username mentions** when Slack users are found
- Service-specific labeling (Cursor vs GitHub Copilot)
- Separate messages for warnings and removal candidates

Example warning message:

```text
You haven't used Cursor for 60 days. If you are planning to not use the app, please inform IT so we can remove the license.
```

Example removal notification:

```text
Cursor license removal candidates (no activity for 90+ days):
- John Doe (john@example.com, <@U12345678>)
- Jane Smith (jane@example.com, <@U87654321>)
- Bob Wilson (bob@example.com)
```

## ⏰ Scheduling

The Lambda function is triggered by EventBridge (CloudWatch Events) **weekly on Mondays at 9:00 AM UTC**. You can modify the schedule in the CDK stack configuration.

## 🔍 API Reference

### Cursor Admin API

Based on the [Cursor Admin API documentation](https://docs.cursor.com/account/teams/admin-api):

- `GET /teams/members` - Fetch team member list
- `POST /teams/daily-usage-data` - Retrieve usage analytics

The API uses basic authentication with your admin API key as the username and empty password.

### GitHub Copilot API

Based on the [GitHub Copilot API documentation](https://docs.github.com/en/rest/copilot/copilot-user-management):

- `GET /orgs/{org}/copilot/billing/seats` - List all Copilot seat assignments with activity data

The API uses Bearer token authentication with your GitHub token.

## 🚀 Deployment

### Initial Setup

1. **Configure AWS credentials** and ensure you have appropriate permissions
2. **Create `.env` file** with your AWS account and region
3. **Build the project**: `npm run build`
4. **Bootstrap CDK** (first time only): `npx cdk bootstrap aws://ACCOUNT/REGION`
5. **Deploy**: `npx cdk deploy`

### Post-Deployment

1. **Update AWS Secrets Manager** with your actual API keys and tokens
2. **Verify Lambda function** is created and configured correctly
3. **Check EventBridge rule** is set up for weekly execution
4. **Monitor CloudWatch Logs** for execution logs

### Useful CDK Commands

- `npx cdk ls` - List all stacks in the app
- `npx cdk synth` - Synthesize CloudFormation template
- `npx cdk deploy` - Deploy stack to AWS
- `npx cdk diff` - Compare deployed stack with current state
- `npx cdk destroy` - Remove stack from AWS account

## 🛠️ Troubleshooting

### Common Issues

**Linting Errors:**

- Always run `npm run lint:fix` after making changes
- This is the ONLY command allowed for fixing linting issues
- If errors remain after running this command, leave them for manual resolution

**Missing Environment Variables:**

- Ensure `.env` file exists with `AWS_ACCOUNT` and `AWS_REGION`
- Check that AWS CLI is configured with appropriate credentials

**Authentication Errors:**

- Verify secrets are updated in AWS Secrets Manager
- Ensure Slack app has required permissions
- Check that API keys are valid and active

**Service-specific Issues:**

- Check that the required service is enabled in environment variables
- Verify that the correct secrets are provided for each service
- Monitor CloudWatch logs for service-specific error messages

**Deployment Issues:**

- Run `npm run build` before CDK operations
- Ensure you have sufficient AWS permissions
- Check CloudFormation stack status in AWS console

### Debugging

- **CloudWatch Logs**: Check `/aws/lambda/InactiveUserCheckerFunction-...` log group
- **Local Testing**: Use `npm run dev` to test functionality locally
- **Manual Trigger**: Test Lambda function manually from AWS console
- **Service-specific Testing**: Use separate endpoints for each service

## 📚 Documentation

- [Local Development Guide](LOCAL_DEVELOPMENT.md) - Detailed guide for local development
- [Agent Guide](AGENT.md) - Quick reference for development
- [Cursor Admin API Documentation](https://docs.cursor.com/account/teams/admin-api) - Official API docs
- [GitHub Copilot API Documentation](https://docs.github.com/en/rest/copilot/copilot-user-management) - Official API docs
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/) - CDK reference

## 🔒 Security

- API keys stored securely in AWS Secrets Manager
- IAM roles with least privilege access
- Slack app permissions scoped to minimum requirements
- No sensitive data in logs or code
- Zod schema validation for all configurations

## 📈 Monitoring

- Lambda execution logs in CloudWatch
- EventBridge rule execution monitoring
- Slack message delivery confirmation
- Error notifications and alerting
- Service-specific performance metrics
