import { z } from "zod";

// Zod schema for secrets validation
const EnvSchema = z.object({
	SECRETS_ARN: z.string().min(1, "SECRETS_ARN must be a non-empty string").optional(),
	NOTIFY_AFTER_DAYS: z.coerce.number().default(60),
	REMOVE_AFTER_DAYS: z.coerce.number().default(90),
	ENABLE_NOTIFICATIONS: z.coerce.boolean().default(true),
	ENABLE_CURSOR: z.coerce.boolean().default(true),
	ENABLE_GITHUB_COPILOT: z.coerce.boolean().default(true),
});
export type EnvData = z.infer<typeof EnvSchema>;

export function getEnv(): EnvData {
	const envData = EnvSchema.safeParse({
		SECRETS_ARN: process.env.SECRETS_ARN,
		NOTIFY_AFTER_DAYS: process.env.NOTIFY_AFTER_DAYS,
		REMOVE_AFTER_DAYS: process.env.REMOVE_AFTER_DAYS,
		ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS,
		ENABLE_CURSOR: process.env.ENABLE_CURSOR,
		ENABLE_GITHUB_COPILOT: process.env.ENABLE_GITHUB_COPILOT,
	});

	if (!envData.success) {
		throw new Error(`Invalid environment configuration: ${envData.error.errors.map((e) => e.message).join(", ")}`);
	}

	return envData.data;
}
