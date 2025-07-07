import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

export interface SecretsData {
	CURSOR_API_KEY: string;
	SLACK_BOT_TOKEN: string;
	SLACK_USER_ID: string;
	SLACK_SIGNING_SECRET: string;
}

/**
 * Fetch secrets from AWS Secrets Manager
 */
export async function fetchSecrets(secretsArn: string): Promise<SecretsData> {
	if (!secretsArn) {
		throw new Error("Missing SECRETS_ARN environment variable.");
	}

	const secretsManagerClient = new SecretsManagerClient({});
	const command = new GetSecretValueCommand({ SecretId: secretsArn });
	const data = await secretsManagerClient.send(command);

	if (!data.SecretString) {
		throw new Error(
			"SecretString is empty. Ensure the secret is populated correctly.",
		);
	}

	const secrets = JSON.parse(data.SecretString);

	if (
		!secrets.CURSOR_API_KEY ||
		!secrets.SLACK_BOT_TOKEN ||
		!secrets.SLACK_USER_ID ||
		!secrets.SLACK_SIGNING_SECRET
	) {
		throw new Error(
			"Missing required secrets: CURSOR_API_KEY, SLACK_BOT_TOKEN, SLACK_USER_ID, or SLACK_SIGNING_SECRET",
		);
	}

	return {
		CURSOR_API_KEY: secrets.CURSOR_API_KEY,
		SLACK_BOT_TOKEN: secrets.SLACK_BOT_TOKEN,
		SLACK_USER_ID: secrets.SLACK_USER_ID,
		SLACK_SIGNING_SECRET: secrets.SLACK_SIGNING_SECRET,
	};
}
