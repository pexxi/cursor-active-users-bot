# Cursor Active Users Bot

A scheduled AWS Lambda function that monitors Cursor IDE usage within your team and sends Slack notifications about inactive users.

## Architecture

The application is now structured with clean separation of concerns:

### Services

- **`CursorAdminApi`** (`src/services/cursor-admin-api.ts`) - Handles interactions with the [Cursor Admin API](https://docs.cursor.com/account/teams/admin-api)
- **`SlackApi`** (`src/services/slack-api.ts`) - Manages Slack message sending with user lookup capabilities
- **`InactiveUsersAnalyzer`** (`src/services/inactive-users-analyzer.ts`) - Contains business logic for identifying inactive users

### Lambda Handler

- **`handler`** (`src/lambda/index.ts`) - Main Lambda function that orchestrates the services

## Features

- ✅ Fetches team members from Cursor Admin API
- ✅ Retrieves daily usage data for the last 2 months
- ✅ Identifies users who haven't been active in Cursor
- ✅ **Looks up Slack usernames by email address**
- ✅ **Sends notifications with @username mentions for better visibility**
- ✅ Sends Slack notifications to specified users/channels
- ✅ Secure secret management via AWS Secrets Manager
- ✅ Comprehensive unit tests with 100% coverage
- ✅ Type-safe implementation with TypeScript

## Configuration

### Environment Variables

The following environment variables are used by the application:

- `SECRETS_ARN`: **(Required)** The ARN (Amazon Resource Name) of the AWS Secrets Manager secret that stores your API keys and Slack tokens. This variable must be set in the Lambda function's environment.
- `INACTIVITY_MONTHS`: **(Optional)** The number of months after which a user is considered inactive. If this variable is not set, is empty, or contains an invalid non-positive integer, the system defaults to `2` months. This can be set in the `.env` file for local CDK context or directly in the Lambda function's environment settings.

### Secrets Manager Setup

Create a secret in AWS Secrets Manager with the following JSON structure:

```json
{
  "CURSOR_API_KEY": "key_your_cursor_admin_api_key_here",
  "SLACK_BOT_TOKEN": "xoxb-your-slack-bot-token-here",
  "SLACK_SIGNING_SECRET": "your-slack-app-signing-secret-here",
  "SLACK_USER_ID": "U1234567890"
}
```

**Note**: The `SLACK_SIGNING_SECRET` is now required for enhanced security when using the Slack Bolt framework.

### Required Permissions

Your Lambda execution role needs:

- `secretsmanager:GetSecretValue` permission for the specified secret
- Standard Lambda execution permissions

### Slack App Permissions

Your Slack app needs the following scopes:

- `chat:write` - Send messages
- `users:read.email` - Look up users by email address

## Development

### Install Dependencies

```bash
npm install
```

### Run Tests

```bash
npm test
```

### Build

```bash
npm run build
```

### Deploy

```bash
npm run cdk deploy
```

## Testing

The project includes comprehensive unit tests for all services:

- **CursorAdminApi tests** - Mock HTTP requests and validate API interactions
- **SlackApi tests** - Mock Slack WebClient and test message formatting
- **InactiveUsersAnalyzer tests** - Test business logic for user activity analysis

Run tests with coverage:

```bash
npm test -- --coverage
```

## API Reference

Based on the [Cursor Admin API documentation](https://docs.cursor.com/account/teams/admin-api), this bot uses:

- `GET /teams/members` - Fetch team member list
- `POST /teams/daily-usage-data` - Retrieve usage analytics

The API uses basic authentication with your admin API key as the username and empty password.

## How It Works

1. **Fetch Secrets** - Retrieves API keys from AWS Secrets Manager
2. **Get Team Members** - Calls Cursor Admin API to get all team members
3. **Fetch Usage Data** - Retrieves daily usage data for the last 2 months
4. **Analyze Activity** - Identifies users without recent activity
5. **Lookup Slack Users** - **NEW**: Finds Slack usernames by email addresses
6. **Send Notifications** - Posts Slack message with inactive user list including @username mentions

## Message Format

The bot now sends enhanced notifications that include:

- Finnish date format for the activity cutoff date
- User display names with email addresses
- **@username mentions** when Slack users are found
- Graceful fallback when users aren't found in Slack

Example message:

```
Inactive Cursor users (no activity since 10.4.2025):
- John Doe (john@example.com, <@U12345678>)
- Jane Smith (jane@example.com, <@U87654321>)
- Bob Wilson (bob@example.com)
```

## Scheduling

The Lambda function is designed to be triggered by EventBridge (CloudWatch Events) on a schedule. Configure the CDK stack to set your desired frequency (e.g., weekly, monthly).

## Prerequisites

- Node.js (v18.x or later recommended, the project currently uses Node.js 22.x runtime for Lambda)
- NPM (comes with Node.js)
- AWS CLI installed and configured with appropriate credentials and default region.
- AWS CDK Toolkit installed globally (`npm install -g aws-cdk`).
- A Cursor Admin API Key.
- A Slack App with a Bot Token and your Slack User ID.

## Manual Setup Steps

1. **Clone the Repository (if applicable)**
    If you haven't already, clone this project to your local machine.

2. **Install Dependencies**
    Navigate to the project's root directory in your terminal and run:

    ```bash
    npm install
    ```

3. **Create and Populate `.env` File**
    In the root directory of the project, create a file named `.env`. This file will store your AWS configuration and optionally, the inactivity months setting. Add the following content to it, replacing the placeholder values with your actual information:

    ```env
    AWS_ACCOUNT=YOUR_AWS_ACCOUNT_ID_HERE
    AWS_REGION=YOUR_AWS_REGION_HERE
    INACTIVITY_MONTHS=2 # Optional: Number of months after which a user is considered inactive. Defaults to 2.
    ```

    - `AWS_ACCOUNT`: Your AWS Account ID where the resources will be deployed.
    - `AWS_REGION`: The AWS Region where the resources will be deployed (e.g., `us-east-1`).
    - `INACTIVITY_MONTHS`: (Optional) Controls how many months of inactivity are checked. The Lambda will use a default of 2 if this is not set or invalid. The CDK stack will pass this value to the Lambda if set here.

    **Note on Secrets**: `CURSOR_API_KEY`, `SLACK_BOT_TOKEN`, `SLACK_USER_ID`, and `SLACK_SIGNING_SECRET` are no longer configured directly in this `.env` file. They will be stored in AWS Secrets Manager. The CDK stack creates a secret with placeholder values, which you must update post-deployment.

4. **Configure Slack App**
    - Ensure you have a Slack App created in your workspace.
    - Navigate to your Slack app's settings page.
    - Under "OAuth & Permissions", find the "Scopes" section.
    - Under "Bot Token Scopes", add the following permissions:
      - `chat:write` - This allows the bot to send messages
      - `users:read.email` - This allows the bot to look up users by email address
    - Install or reinstall the app to your workspace for the new permissions to take effect.
    - You will need the "Bot User OAuth Token", "Signing Secret", and your "Slack User ID" to update the AWS Secret after deployment (see Post-Deployment section).
    - To find your `SLACK_USER_ID`: In Slack, click on your profile picture, then "View profile". Click the three-dot menu (...) and select "Copy member ID".
    - To find your `SLACK_SIGNING_SECRET`: In your Slack app settings, go to "Basic Information" and find the "Signing Secret" under "App Credentials".

## Build the Project

Before deploying, you need to compile the TypeScript code for the CDK stack definition:

```bash
npm run build
```

This command uses the TypeScript compiler (`tsc`) as defined in your `package.json` to transpile the `.ts` files in `lib/` and `bin/`. The Lambda function code in `src/lambda/index.ts` will be automatically bundled by the `NodejsFunction` construct during the CDK synthesis process.

## Deploy to AWS

1. **Bootstrap CDK (if first time in this AWS Account/Region)**
    If you have never used AWS CDK in the target AWS account and region before, you need to run the bootstrap command. This sets up necessary resources for CDK to manage deployments.

    ```bash
    npx cdk bootstrap aws://YOUR_AWS_ACCOUNT_ID/YOUR_AWS_REGION
    ```

    Replace `YOUR_AWS_ACCOUNT_ID` and `YOUR_AWS_REGION` with the values from your `.env` file.

2. **Deploy the Stack**
    Once bootstrapped (if necessary) and after building the project, deploy the CDK stack:

    ```bash
    npx cdk deploy
    ```

    CDK will synthesize the CloudFormation template, show you the resources that will be created or modified (including an AWS Secrets Manager secret named `CursorActiveUserBotSecrets`), and ask for confirmation before proceeding.

    After successful deployment, the Lambda function will be created, the secret will be initialized with placeholders, and an EventBridge rule will be set up to trigger the Lambda on the 1st of every month at 00:00 UTC.

## Post-Deployment

- **Update Secrets in AWS Secrets Manager**:
    After the initial deployment, the `CursorActiveUserBotSecrets` secret in AWS Secrets Manager will contain placeholder values. You **must** update this secret with your actual `CURSOR_API_KEY`, `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and `SLACK_USER_ID`.
    1. Go to the AWS Secrets Manager console.
    2. Find the secret named `CursorActiveUserBotSecrets` (the exact name might have a suffix depending on your CDK deployment).
    3. Click on the secret and choose "Retrieve secret value".
    4. Click "Edit".
    5. Update the JSON key-value pairs with your actual credentials:

        ```json
        {
          "CURSOR_API_KEY": "YOUR_ACTUAL_CURSOR_API_KEY",
          "SLACK_BOT_TOKEN": "YOUR_ACTUAL_SLACK_BOT_TOKEN",
          "SLACK_SIGNING_SECRET": "YOUR_ACTUAL_SLACK_SIGNING_SECRET",
          "SLACK_USER_ID": "YOUR_ACTUAL_SLACK_USER_ID"
        }
        ```

    6. Save the changes.
    The Lambda function is configured to read these values from this secret at runtime.

- **Verify Lambda Function**: You can go to the AWS Lambda console to see your deployed function (`InactiveUserCheckerFunction-...`). Check its environment variables to see the `SECRETS_ARN` pointing to the secret.
- **Check EventBridge Rule**: In the AWS EventBridge console, under "Rules", you should find the `MonthlyInactiveUserCheckRule-...`.
- **Monitor Logs**: CloudWatch Logs will contain logs from the Lambda function executions. This is useful for troubleshooting or verifying that the function runs as expected. The log group will typically be named `/aws/lambda/InactiveUserCheckerFunction-...`.
- **Test Manually (Optional)**: You can manually trigger the Lambda function from the AWS Lambda console with a test event (a simple empty JSON object `{}` will suffice as the event payload is just logged for scheduled events) to check its behavior immediately without waiting for the schedule.

## Useful CDK Commands

- `npm run build`   Compile CDK TypeScript to JavaScript
- `npm run watch`   Watch for changes and compile CDK TypeScript
- `npm run test`    Perform the jest unit tests (if any are configured)
- `npx cdk ls`      List all stacks in the app
- `npx cdk synth`   Emits the synthesized CloudFormation template
- `npx cdk deploy`  Deploy this stack to your default AWS account/region (or the one configured in `.env`)
- `npx cdk diff`    Compare deployed stack with current state
- `npx cdk destroy` Remove this stack from your AWS account

## Troubleshooting

- **Missing Environment Variables in `.env`**: Ensure `AWS_ACCOUNT` and `AWS_REGION` in `.env` are correctly set. The `INACTIVITY_MONTHS` variable is optional in `.env` as the Lambda has a default.
- **Secrets Not Updated**: If the Lambda function fails with authentication or API errors, ensure you have updated the placeholder values in the `CursorActiveUserBotSecrets` secret in AWS Secrets Manager with your actual keys and tokens.
- **Permissions Issues**:
  - If the Lambda has trouble calling Cursor or Slack APIs (after updating secrets), double-check that the API keys and tokens are correct and have the necessary permissions on their respective platforms.
  - Ensure the IAM Role created for the Lambda function by CDK has permissions to write logs to CloudWatch and read from the specified Secrets Manager secret (CDK should configure this automatically).
- **CDK Deployment Errors**: Check the error messages from the `cdk deploy` command. They often point to configuration issues or missing permissions for the CDK deployment role.
