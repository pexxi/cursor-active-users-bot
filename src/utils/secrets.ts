import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import * as z from "zod/v4";
import { getEnv } from "./env";

// Zod schema for secrets validation
const SecretsSchema = z.object({
	CURSOR_API_KEY: z.string().min(1, "CURSOR_API_KEY must be a non-empty string"),
	GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN must be a non-empty string"),
	GITHUB_ORG: z.string().min(1, "GITHUB_ORG must be a non-empty string"),
	SLACK_BOT_TOKEN: z.string().min(1, "SLACK_BOT_TOKEN must be a non-empty string"),
	SLACK_USER_ID: z.string().min(1, "SLACK_USER_ID must be a non-empty string"),
	SLACK_SIGNING_SECRET: z.string().min(1, "SLACK_SIGNING_SECRET must be a non-empty string"),
});
export type SecretsData = z.infer<typeof SecretsSchema>;

/**
 * Fetch secrets from AWS Secrets Manager
 */
export async function fetchSecrets() {
	const { SECRETS_ARN } = getEnv();
	const secretsManagerClient = new SecretsManagerClient({});
	const command = new GetSecretValueCommand({ SecretId: SECRETS_ARN });
	const data = await secretsManagerClient.send(command);

	if (!data.SecretString) {
		throw new Error("SecretString is empty. Ensure the secret is populated correctly.");
	}

	let parsedSecrets: unknown;
	try {
		parsedSecrets = JSON.parse(data.SecretString);
	} catch (_error) {
		throw new Error("Failed to parse secrets JSON from AWS Secrets Manager");
	}

	// Validate secrets using Zod schema
	const validationResult = SecretsSchema.safeParse(parsedSecrets);
	if (!validationResult.success) {
		console.error(z.prettifyError(validationResult.error));
		throw new Error(`Invalid secrets configuration:\n${z.prettifyError(validationResult.error)}`);
	}

	console.log("Successfully fetched secrets from AWS Secrets Manager.");

	return validationResult.data;
}

/**
 * Load secrets from environment variables for local development
 */
export function loadLocalSecrets(): SecretsData {
	// Validate secrets using Zod schema
	const validationResult = SecretsSchema.safeParse({
		CURSOR_API_KEY: process.env.CURSOR_API_KEY,
		GITHUB_TOKEN: process.env.GITHUB_TOKEN,
		GITHUB_ORG: process.env.GITHUB_ORG,
		SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
		SLACK_USER_ID: process.env.SLACK_USER_ID,
		SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
	});

	if (!validationResult.success) {
		console.error(z.prettifyError(validationResult.error));
		throw new Error(`Invalid secrets configuration:\n${z.prettifyError(validationResult.error)}`);
	}

	console.log("SECRETS:\n", validationResult.data);

	return validationResult.data;
}
