# Local Development Guide

This guide explains how to run the Cursor Active Users Bot locally for development and testing.

## Prerequisites

- Node.js (v18 or later)
- npm
- Access to Cursor Admin API (if using Cursor monitoring)
- Access to GitHub API (if using GitHub Copilot monitoring)
- Slack bot token with appropriate permissions

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Create a `.env` file in the root directory with the following variables:

   ```env
   # Local server configuration
   PORT=3000

   # Service configuration
   NOTIFY_AFTER_DAYS=60
   REMOVE_AFTER_DAYS=90
   ENABLE_CURSOR=true
   ENABLE_GITHUB_COPILOT=true
   ENABLE_SLACK_NOTIFICATIONS=true

   # Cursor API (required if ENABLE_CURSOR=true)
   CURSOR_API_KEY=your_actual_cursor_api_key

   # GitHub API (required if ENABLE_GITHUB_COPILOT=true)
   GITHUB_TOKEN=your_actual_github_token
   GITHUB_ORG=your_github_organization_name

   # Slack API (required for notifications)
   SLACK_BOT_TOKEN=xoxb-your_actual_slack_bot_token
   SLACK_SIGNING_SECRET=your_actual_slack_signing_secret
   SLACK_USER_ID=your_actual_slack_user_id
   ```

   **Getting the required tokens:**

   - **CURSOR_API_KEY**: Get this from your Cursor team admin settings
   - **GITHUB_TOKEN**: Create a GitHub Personal Access Token with `manage_billing:copilot` or `read:org` permissions
   - **GITHUB_ORG**: Your GitHub organization name
   - **SLACK_BOT_TOKEN**: Create a Slack app and install it to your workspace
   - **SLACK_SIGNING_SECRET**: Found in your Slack app settings under "Basic Information" → "App Credentials"
   - **SLACK_USER_ID**: Your Slack user ID where notifications should be sent

   **Required Slack App Permissions:**
   Your Slack app must have the following scopes:
   - `chat:write` - Send messages
   - `users:read.email` - Look up users by email address

## Running the Local Server

### Development Mode (with auto-restart)

```bash
npm run dev
```

### Production Mode

```bash
npm run build
node dist/server/local-server.js
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### GET /

Returns information about available endpoints and current configuration.

**Example:**

```bash
curl http://localhost:3000/
```

**Response:**

```json
{
  "message": "Cursor Active Users Bot - Local Server",
  "endpoints": {
    "GET /": "This help message",
    "POST /check-cursor": "Trigger inactive Cursor users check",
    "POST /check-github": "Trigger inactive GitHub Copilot users check",
    "GET /health": "Health check endpoint"
  }
}
```

### GET /health

Health check endpoint.

**Example:**

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### POST /check-cursor

Triggers the Cursor inactive users check manually.

**Example:**

```bash
curl -X POST http://localhost:3000/check-cursor \
  -H "Content-Type: application/json"
```

**Response format:**

```json
{
  "usersToNotify": [
    {
      "email": "user1@example.com",
      "name": "User One"
    }
  ],
  "usersToRemove": [
    {
      "email": "user2@example.com",
      "name": "User Two"
    }
  ]
}
```

### POST /check-github

Triggers the GitHub Copilot inactive users check manually.

**Example:**

```bash
curl -X POST http://localhost:3000/check-github \
  -H "Content-Type: application/json"
```

**Response format:**

```json
{
  "usersToNotify": [
    {
      "email": "developer@example.com",
      "name": "developer"
    }
  ],
  "usersToRemove": [
    {
      "email": "inactive@example.com",
      "name": "inactive-user"
    }
  ]
}
```

## How It Works

The local version replicates the same logic as the AWS Lambda function:

### Cursor Operations

1. **Load Configuration**: Reads environment variables for service configuration
2. **Fetch Team Members**: Uses Cursor Admin API to get team member list
3. **Fetch Usage Data**: Gets daily usage data for the specified time periods
4. **Analyze Inactive Users**: Identifies users with no activity in the time periods
5. **Categorize Users**:
   - Users inactive for `NOTIFY_AFTER_DAYS` → notification candidates
   - Users inactive for `REMOVE_AFTER_DAYS` → removal candidates
6. **Send Notifications**: Sends DMs to notification candidates and channel messages for removal candidates

### GitHub Operations

1. **Load Configuration**: Reads environment variables for service configuration
2. **Fetch Copilot Seats**: Uses GitHub API to get Copilot seat assignments
3. **Analyze Activity**: Checks last activity dates for each user
4. **Categorize Users**:
   - Users inactive for `NOTIFY_AFTER_DAYS` → notification candidates
   - Users inactive for `REMOVE_AFTER_DAYS` → removal candidates
5. **Send Notifications**: Sends service-specific notifications

### Enhanced Slack Notifications

The bot provides rich notifications including:

- **User mentions**: Automatically looks up Slack users by email and includes @username mentions
- **Service-specific messages**: Different messaging for Cursor vs GitHub Copilot
- **Multi-level notifications**: Warning DMs and removal notifications
- **Graceful fallback**: Shows users even when they're not found in Slack

Example notification messages:

**Warning DM:**

```text
You haven't used Cursor for 60 days. If you are planning to not use the app, please inform IT so we can remove the license.
```

**Removal notification:**

```text
Cursor license removal candidates (no activity for 90+ days):
- John Doe (john@example.com, <@U12345678>)
- Jane Smith (jane@example.com, <@U87654321>)
- Bob Wilson (bob@example.com)
```

## Service Configuration

You can configure which services to run by setting environment variables:

### Cursor Only

```env
ENABLE_CURSOR=true
ENABLE_GITHUB_COPILOT=false
CURSOR_API_KEY=your_cursor_api_key
SLACK_BOT_TOKEN=your_slack_bot_token
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_USER_ID=your_slack_user_id
```

### GitHub Copilot Only

```env
ENABLE_CURSOR=false
ENABLE_GITHUB_COPILOT=true
GITHUB_TOKEN=your_github_token
GITHUB_ORG=your_github_org
SLACK_BOT_TOKEN=your_slack_bot_token
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_USER_ID=your_slack_user_id
```

### Both Services

```env
ENABLE_CURSOR=true
ENABLE_GITHUB_COPILOT=true
# Include all required secrets for both services
```

### Disable Notifications (for testing)

```env
ENABLE_SLACK_NOTIFICATIONS=false
```

## Differences from AWS Lambda Version

- **Environment Variables**: Uses `.env` file instead of AWS Secrets Manager
- **Server Architecture**: Runs as Express server instead of scheduled Lambda
- **Manual Triggers**: HTTP endpoints instead of CloudWatch Events
- **Service Endpoints**: Separate endpoints for each service
- **Development Features**: Health check and information endpoints

## Troubleshooting

### Common Issues

1. **"Missing required environment variables" error**
   - Make sure all required variables are set in your `.env` file
   - Check that the `.env` file is in the project root directory
   - Verify that required secrets are provided for enabled services

2. **"Cannot find module" errors**
   - Run `npm install` to install dependencies
   - Ensure TypeScript is compiled with `npm run build`

3. **API authentication errors**
   - Verify your CURSOR_API_KEY is correct and has proper permissions
   - Check that your GITHUB_TOKEN has required permissions for your organization
   - Ensure your SLACK_BOT_TOKEN is valid and the bot is installed in your workspace
   - Verify your SLACK_SIGNING_SECRET is correct from your Slack app settings

4. **Service-specific errors**
   - Check that the service is enabled in your environment variables
   - Verify that required secrets are provided for enabled services
   - Monitor console logs for service-specific error messages

5. **No inactive users found but expecting some**
   - Check the `NOTIFY_AFTER_DAYS` and `REMOVE_AFTER_DAYS` values
   - Verify the date ranges in the logs match your expectations
   - Ensure the usage data is being fetched correctly

### Debugging Tips

- **Check console output**: The server logs detailed information about the process
- **Service isolation**: Each service runs independently, so you can test them separately
- **Use health endpoint**: Verify the server is running correctly
- **Test with notifications disabled**: Set `ENABLE_SLACK_NOTIFICATIONS=false` to test logic without sending messages

The server logs show:

- Service configuration and enabled services
- Number of team members/seats fetched
- Date ranges for usage data
- Number of inactive users found
- Notification sending status

## Development Tips

- **Use `npm run dev`** for development - it automatically restarts when you make changes
- **Test different configurations** by adjusting environment variables
- **Use separate endpoints** to test each service independently
- **Monitor logs** for detailed information about the process
- **Test notification logic** by temporarily disabling notifications

## Example Development Workflow

1. **Start development server:**

   ```bash
   npm run dev
   ```

2. **Test Cursor service:**

   ```bash
   curl -X POST http://localhost:3000/check-cursor
   ```

3. **Test GitHub Copilot service:**

   ```bash
   curl -X POST http://localhost:3000/check-github
   ```

4. **Make changes and test again** (server auto-restarts)

5. **Run tests:**

   ```bash
   npm test
   ```

6. **Build and deploy:**

   ```bash
   npm run build
   npx cdk deploy
   ```
