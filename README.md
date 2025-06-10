# Cursor Active Users Bot

A scheduled AWS Lambda function that monitors Cursor IDE usage within your team and sends Slack notifications about inactive users.

## 🚀 Features

- ✅ Fetches team members from Cursor Admin API
- ✅ Retrieves daily usage data with configurable time periods
- ✅ Identifies users who haven't been active in Cursor
- ✅ **Looks up Slack usernames by email address**
- ✅ **Sends notifications with @username mentions for better visibility**
- ✅ Sends Slack notifications to specified users/channels
- ✅ Secure secret management via AWS Secrets Manager
- ✅ Comprehensive unit tests with 100% coverage
- ✅ Type-safe implementation with TypeScript
- ✅ Local development server for testing
- ✅ Clean service-based architecture

## 🏗️ Architecture

The application is structured with clean separation of concerns:

### Services (`src/services/`)

- **`CursorAdminApi`** - Handles interactions with the [Cursor Admin API](https://docs.cursor.com/account/teams/admin-api)
- **`SlackApi`** - Manages Slack message sending with user lookup capabilities
- **`InactiveUsersAnalyzer`** - Contains business logic for identifying inactive users

### Lambda Handler (`src/lambda/`)

- **`handler`** - Main Lambda function that orchestrates the services

### Local Development Server (`src/server/`)

- **`local-server`** - Express server for local development and testing

## 📋 Prerequisites

- Node.js (v18.x or later recommended, project uses Node.js 22.x runtime for Lambda)
- NPM (comes with Node.js)
- AWS CLI installed and configured with appropriate credentials
- AWS CDK Toolkit installed globally (`npm install -g aws-cdk`)
- A Cursor Admin API Key
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

### AWS Secrets Manager

After deployment, update the `CursorActiveUserBotSecrets` secret in AWS Secrets Manager:

```json
{
  "CURSOR_API_KEY": "key_your_cursor_admin_api_key_here",
  "SLACK_BOT_TOKEN": "xoxb-your-slack-bot-token-here",
  "SLACK_SIGNING_SECRET": "your-slack-app-signing-secret-here",
  "SLACK_USER_ID": "U1234567890"
}
```

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

# Test the inactive users check
curl -X POST http://localhost:3000/check-inactive-users
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

- **CursorAdminApi tests** - Mock HTTP requests and validate API interactions
- **SlackApi tests** - Mock Slack WebClient and test message formatting
- **InactiveUsersAnalyzer tests** - Test business logic for user activity analysis

Run tests with coverage:

```bash
npm test

# Run tests in watch mode during development
npm test -- --watch
```

## 📊 How It Works

1. **Fetch Secrets** - Retrieves API keys from AWS Secrets Manager
2. **Get Team Members** - Calls Cursor Admin API to get all team members
3. **Fetch Usage Data** - Retrieves daily usage data for the last 2 months
4. **Analyze Activity** - Identifies users without recent activity
5. **Lookup Slack Users** - Finds Slack usernames by email addresses
6. **Send Notifications** - Posts Slack message with inactive user list including @username mentions

## 💬 Message Format

The bot sends enhanced notifications that include:

- Finnish date format for the activity cutoff date
- User display names with email addresses
- **@username mentions** when Slack users are found
- Graceful fallback when users aren't found in Slack

Example message:

```text
Inactive Cursor users (no activity since 10.4.2025):
- John Doe (john@example.com, <@U12345678>)
- Jane Smith (jane@example.com, <@U87654321>)
- Bob Wilson (bob@example.com)
```

## ⏰ Scheduling

The Lambda function is triggered by EventBridge (CloudWatch Events) on the 1st of every month at 00:00 UTC. You can modify the schedule in the CDK stack configuration.

## 🔍 API Reference

Based on the [Cursor Admin API documentation](https://docs.cursor.com/account/teams/admin-api):

- `GET /teams/members` - Fetch team member list
- `POST /teams/daily-usage-data` - Retrieve usage analytics

The API uses basic authentication with your admin API key as the username and empty password.

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
3. **Check EventBridge rule** is set up for monthly execution
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

**Deployment Issues:**

- Run `npm run build` before CDK operations
- Ensure you have sufficient AWS permissions
- Check CloudFormation stack status in AWS console

### Debugging

- **CloudWatch Logs**: Check `/aws/lambda/InactiveUserCheckerFunction-...` log group
- **Local Testing**: Use `npm run dev` to test functionality locally
- **Manual Trigger**: Test Lambda function manually from AWS console

## 📚 Documentation

- [Local Development Guide](LOCAL_DEVELOPMENT.md) - Detailed guide for local development
- [Cursor Admin API Documentation](https://docs.cursor.com/account/teams/admin-api) - Official API docs
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/) - CDK reference

## 🔒 Security

- API keys stored securely in AWS Secrets Manager
- IAM roles with least privilege access
- Slack app permissions scoped to minimum requirements
- No sensitive data in logs or code

## 📈 Monitoring

- Lambda execution logs in CloudWatch
- EventBridge rule execution monitoring
- Slack message delivery confirmation
- Error notifications and alerting
