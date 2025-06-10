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
		const account = props?.env?.account || process.env.AWS_ACCOUNT;
		const region = props?.env?.region || process.env.AWS_REGION;

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
				timeout: cdk.Duration.minutes(1), // Adjust timeout as needed
				memorySize: 256, // Adjust memory as needed
				environment: {
					SECRETS_ARN: apiSecrets.secretArn,
					INACTIVITY_MONTHS: process.env.INACTIVITY_MONTHS || "",
					// AWS_ACCOUNT and AWS_REGION are typically implicitly handled by CDK based on context/profile
					// but can be passed if the lambda needs them for other AWS SDK calls unrelated to its own execution region/account.
				},
			},
		);

		// Grant the Lambda function read access to the secret
		apiSecrets.grantRead(inactiveUserCheckerLambda);

		// Define the EventBridge rule to run the Lambda monthly
		// Runs at 00:00 UTC on the 1st day of every month
		const rule = new events.Rule(this, "MonthlyInactiveUserCheckRule", {
			schedule: events.Schedule.cron({
				minute: "0",
				hour: "0",
				day: "1",
				month: "*", // Every month
				year: "*", // Every year
			}),
			description:
				"Triggers the inactive user checker Lambda function monthly.",
		});

		// Set the Lambda function as the target for the EventBridge rule
		rule.addTarget(new targets.LambdaFunction(inactiveUserCheckerLambda));

		// Output the Lambda function name
		new cdk.CfnOutput(this, "LambdaFunctionName", {
			value: inactiveUserCheckerLambda.functionName,
			description: "Name of the Inactive User Checker Lambda function",
		});
	}
}
