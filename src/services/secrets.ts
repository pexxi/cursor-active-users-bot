import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { z } from "zod";

// Zod schema for secrets validation
const SecretsSchema = z.object({
	CURSOR_API_KEY: z
		.string()
		.min(1, "CURSOR_API_KEY must be a non-empty string")
		.optional(),
	SLACK_BOT_TOKEN: z
		.string()
		.min(1, "SLACK_BOT_TOKEN must be a non-empty string"),
	SLACK_USER_ID: z.string().min(1, "SLACK_USER_ID must be a non-empty string"),
	SLACK_SIGNING_SECRET: z
		.string()
		.min(1, "SLACK_SIGNING_SECRET must be a non-empty string"),
	GITHUB_TOKEN: z
		.string()
		.min(1, "GITHUB_TOKEN must be a non-empty string")
		.optional(),
});

export type SecretsData = z.infer<typeof SecretsSchema>;

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

	let parsedSecrets: unknown;
	try {
		parsedSecrets = JSON.parse(data.SecretString);
	} catch (_error) {
		throw new Error("Failed to parse secrets JSON from AWS Secrets Manager");
	}

	// Validate secrets using Zod schema
	const validationResult = SecretsSchema.safeParse(parsedSecrets);
	if (!validationResult.success) {
		const errorMessages = validationResult.error.errors
			.map((err) => `${err.path.join(".")}: ${err.message}`)
			.join(", ");
		throw new Error(`Invalid secrets configuration: ${errorMessages}`);
	}

	return validationResult.data;
}
