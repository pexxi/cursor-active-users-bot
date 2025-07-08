import * as dotenv from "dotenv";
import * as z from "zod/v4";

dotenv.config();

// Zod schema for secrets validation
const EnvSchema = z.object({
	SECRETS_ARN: z.string().min(1, "SECRETS_ARN must be a non-empty string").optional(),
	NOTIFY_AFTER_DAYS: z.coerce.number().default(60),
	REMOVE_AFTER_DAYS: z.coerce.number().default(90),
	ENABLE_SLACK_NOTIFICATIONS: z.stringbool().default(true),
	ENABLE_CURSOR: z.stringbool().default(true),
	ENABLE_GITHUB_COPILOT: z.stringbool().default(true),
});
export type EnvData = z.infer<typeof EnvSchema>;

export function getEnv(isLocal = false): EnvData {
	const envData = EnvSchema.safeParse({
		SECRETS_ARN: process.env.SECRETS_ARN,
		NOTIFY_AFTER_DAYS: process.env.NOTIFY_AFTER_DAYS,
		REMOVE_AFTER_DAYS: process.env.REMOVE_AFTER_DAYS,
		ENABLE_SLACK_NOTIFICATIONS: process.env.ENABLE_SLACK_NOTIFICATIONS,
		ENABLE_CURSOR: process.env.ENABLE_CURSOR,
		ENABLE_GITHUB_COPILOT: process.env.ENABLE_GITHUB_COPILOT,
	});

	if (!envData.success) {
		console.error(z.prettifyError(envData.error));
		throw new Error(`Invalid environment configuration:\n${z.prettifyError(envData.error)}`);
	}

	if (isLocal) {
		console.log("ENV:\n", envData.data);
	}

	return envData.data;
}
