import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { CursorActiveUsersBotStack } from "../lib/cursor-active-users-bot-stack";

// Load environment variables from .env file to make them available for the CDK app context
dotenv.config();

const app = new cdk.App();

const account = process.env.AWS_ACCOUNT;
const region = process.env.AWS_REGION;

if (!account || !region) {
	throw new Error(
		"AWS_ACCOUNT and AWS_REGION environment variables must be set in .env for CDK app initialization.",
	);
}

new CursorActiveUsersBotStack(app, "CursorActiveUsersBotStack", {
	env: {
		account: account,
		region: region,
	},
	/* If you don't specify 'env', this stack will be environment-agnostic.
	 * Account/Region-dependent features and context lookups will not work,
	 * but a single synthesized template can be deployed anywhere. */

	/* Uncomment the next line to specialize this stack for the AWS Account
	 * and Region that are implied by the current CLI configuration. */
	// env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

	/* Uncomment the next line if you know exactly what Account and Region you
	 * want to deploy the stack to. */
	// env: { account: '123456789012', region: 'us-east-1' },

	/* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
