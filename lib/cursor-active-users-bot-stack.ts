import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { SecretValue } from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";

interface CursorActiveUsersBotStackProps extends cdk.StackProps {
	env?: {
		account: string;
		region: string;
	};
}

export class CursorActiveUsersBotStack extends cdk.Stack {
	constructor(
		scope: Construct,
		id: string,
		props?: CursorActiveUsersBotStackProps,
	) {
		super(scope, id, props);

		// For testing, we can get account and region from props.env
		// For actual deployment, we need them from environment variables
		const _account = props?.env?.account || process.env.AWS_ACCOUNT;
		const _region = props?.env?.region || process.env.AWS_REGION;

		// Only check environment variables if not provided via props (for actual deployment)
		if (!props?.env && (!process.env.AWS_ACCOUNT || !process.env.AWS_REGION)) {
			throw new Error(
				"Missing required environment variables in .env file for CDK stack. Please check AWS_ACCOUNT, and AWS_REGION.",
			);
		}

		// Create a new secret for API keys
		const apiSecrets = new secretsmanager.Secret(this, "ApiSecrets", {
			secretName: "CursorActiveUserBotSecrets",
			description: "API keys for Cursor and Slack bots",
			secretObjectValue: {
				CURSOR_API_KEY: SecretValue.unsafePlainText(
					"YOUR_CURSOR_API_KEY_PLACEHOLDER",
				),
				SLACK_BOT_TOKEN: SecretValue.unsafePlainText(
					"YOUR_SLACK_BOT_TOKEN_PLACEHOLDER",
				),
				SLACK_USER_ID: SecretValue.unsafePlainText(
					"YOUR_SLACK_USER_ID_PLACEHOLDER",
				),
				SLACK_SIGNING_SECRET: SecretValue.unsafePlainText(
					"YOUR_SLACK_SIGNING_SECRET_PLACEHOLDER",
				),
			},
		});

		// Define the Lambda function
		const inactiveUserCheckerLambda = new NodejsFunction(
			this,
			"InactiveUserCheckerFunction",
			{
				runtime: lambda.Runtime.NODEJS_22_X,
				entry: path.join(__dirname, "../src/lambda/index.ts"), // Path to the lambda handler file
				handler: "handler", // Function name in index.ts
				timeout: cdk.Duration.minutes(5), // Increased from 1 minute to handle more processing
				memorySize: 512, // Increased from 256MB to handle more users
				environment: {
					SECRETS_ARN: apiSecrets.secretArn,
					NOTIFY_AFTER_DAYS: "60", // Default: 60 days for DM notifications
					REMOVE_AFTER_DAYS: "90", // Default: 90 days for removal candidates
					// AWS_ACCOUNT and AWS_REGION are typically implicitly handled by CDK based on context/profile
					// but can be passed if the lambda needs them for other AWS SDK calls unrelated to its own execution region/account.
				},
			},
		);

		// Grant the Lambda function read access to the secret
		apiSecrets.grantRead(inactiveUserCheckerLambda);

		// Define the EventBridge rule to run the Lambda weekly
		// Runs at 09:00 UTC every Monday
		const rule = new events.Rule(this, "WeeklyInactiveUserCheckRule", {
			schedule: events.Schedule.cron({
				minute: "0",
				hour: "9",
				weekDay: "MON", // Every Monday
				month: "*", // Every month
				year: "*", // Every year
			}),
			description:
				"Triggers the inactive user checker Lambda function weekly on Mondays at 9 AM UTC.",
		});

		// Set the Lambda function as the target for the EventBridge rule
		rule.addTarget(new targets.LambdaFunction(inactiveUserCheckerLambda));

		// Output the Lambda function name
		new cdk.CfnOutput(this, "LambdaFunctionName", {
			value: inactiveUserCheckerLambda.functionName,
			description: "Name of the Inactive User Checker Lambda function",
		});

		// Output the schedule information
		new cdk.CfnOutput(this, "ScheduleInfo", {
			value: "Runs weekly on Mondays at 9:00 AM UTC",
			description: "Lambda execution schedule",
		});
	}
}
