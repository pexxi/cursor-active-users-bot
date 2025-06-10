# Local Development Guide

This guide explains how to run the Cursor Active Users Bot locally for development and testing.

## Prerequisites

- Node.js (v18 or later)
- npm
- Access to Cursor team admin API
- Slack bot token with appropriate permissions

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy the `env.example` file to `.env`:

   ```bash
   cp env.example .env
   ```

   Edit `.env` and fill in your actual values:

   ```env
   PORT=3000
   CURSOR_API_KEY=your_actual_cursor_api_key
   SLACK_BOT_TOKEN=xoxb-your_actual_slack_bot_token
   SLACK_SIGNING_SECRET=your_actual_slack_signing_secret
   SLACK_USER_ID=your_actual_slack_user_id
   ```

   **Getting the required tokens:**
   - **CURSOR_API_KEY**: Get this from your Cursor team admin settings
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
npm run local
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### GET /

Returns information about available endpoints.

**Example:**

```bash
curl http://localhost:3000/
```

### GET /health

Health check endpoint.

**Example:**

```bash
curl http://localhost:3000/health
```

### POST /check-inactive-users

Triggers the inactive users check manually.

**Example:**

```bash
# Default check (2 months back)
curl -X POST http://localhost:3000/check-inactive-users \
  -H "Content-Type: application/json"

# Custom time period (e.g., 3 months back)
curl -X POST http://localhost:3000/check-inactive-users \
  -H "Content-Type: application/json" \
  -d '{"monthsBack": 3}'
```

**Response format:**

```json
{
  "success": true,
  "message": "Found 2 inactive users. Notification sent to Slack.",
  "inactiveUsers": [
    {
      "email": "user1@example.com",
      "name": "User One"
    },
    {
      "email": "user2@example.com", 
      "name": "User Two"
    }
  ],
  "totalMembers": 10,
  "monthsBack": 2
}
```

## How It Works

The local version replicates the same logic as the AWS Lambda function:

1. **Load Configuration**: Reads environment variables instead of AWS Secrets Manager
2. **Fetch Team Members**: Uses Cursor Admin API to get team member list
3. **Fetch Usage Data**: Gets daily usage data for the specified time period
4. **Analyze Inactive Users**: Identifies users with no activity in the time period
5. **Lookup Slack Users**: **NEW**: Finds Slack usernames by email addresses
6. **Send Notifications**: Sends enhanced Slack messages with @username mentions if inactive users are found

## Enhanced Slack Notifications

The bot now provides richer notifications including:

- **User mentions**: Automatically looks up Slack users by email and includes @username mentions
- **Finnish date format**: Shows the activity cutoff date in Finnish format
- **Graceful fallback**: Shows users even when they're not found in Slack

Example notification:

```text
Inactive Cursor users (no activity since 10.4.2025):
- John Doe (john@example.com, <@U12345678>)
- Jane Smith (jane@example.com, <@U87654321>)
- Bob Wilson (bob@example.com)
```

## Differences from AWS Lambda Version

- Uses environment variables instead of AWS Secrets Manager
- Runs as Express server instead of scheduled Lambda
- Manual trigger via HTTP endpoint instead of CloudWatch Events
- Includes additional API endpoints for health checks and information

## Troubleshooting

### Common Issues

1. **"Missing required environment variables" error**
   - Make sure all required variables are set in your `.env` file
   - Check that the `.env` file is in the project root directory

2. **"Cannot find module 'express'" error**
   - Run `npm install` to install dependencies

3. **API authentication errors**
   - Verify your CURSOR_API_KEY is correct and has proper permissions
   - Check that your SLACK_BOT_TOKEN is valid and the bot is installed in your workspace
   - Ensure your SLACK_SIGNING_SECRET is correct from your Slack app settings
   - Verify your Slack app has both `chat:write` and `users:read.email` permissions

4. **No inactive users found but expecting some**
   - Try increasing the `monthsBack` parameter
   - Verify the date range in the logs matches your expectations
   - Check if the usage data is being fetched correctly

### Debugging Tips

- Check the console output for detailed logs about the process
- The server logs show:
  - Number of team members fetched
  - Date range for usage data
  - Number of usage entries fetched
  - Inactive users found

## Development Tips

- Use `npm run dev` for development - it automatically restarts when you make changes
- Test different time periods by adjusting the `monthsBack` parameter
- Check the `/health` endpoint to verify the server is running
- Use the root endpoint `/` to see available API endpoints
