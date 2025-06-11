import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type { Context, ScheduledEvent } from "aws-lambda";
import * as dotenv from "dotenv";
import { CursorAdminApi } from "../services/cursor-admin-api";
import {
	categorizeInactiveUsers,
	getUsageDataDateRange,
} from "../services/inactive-users-analyzer";
import { SlackApi } from "../services/slack-api";

dotenv.config();

const SECRETS_ARN = process.env.SECRETS_ARN; // Name or ARN of the secret in AWS Secrets Manager
const NOTIFY_AFTER_DAYS = Number.parseInt(
	process.env.NOTIFY_AFTER_DAYS || "60",
	10,
);
const REMOVE_AFTER_DAYS = Number.parseInt(
	process.env.REMOVE_AFTER_DAYS || "90",
	10,
);

interface SecretsData {
	CURSOR_API_KEY: string;
	SLACK_BOT_TOKEN: string;
	SLACK_USER_ID: string;
	SLACK_SIGNING_SECRET: string;
}

/**
 * Fetch secrets from AWS Secrets Manager
 */
async function fetchSecrets(): Promise<SecretsData> {
	if (!SECRETS_ARN) {
		throw new Error("Missing SECRETS_ARN environment variable.");
	}

	const secretsManagerClient = new SecretsManagerClient({});
	const command = new GetSecretValueCommand({ SecretId: SECRETS_ARN });
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

export const handler = async (
	event: ScheduledEvent,
	context: Context,
): Promise<void> => {
	console.log("Scheduled event received:", JSON.stringify(event, null, 2));
	console.log(
		`Configuration: NOTIFY_AFTER_DAYS=${NOTIFY_AFTER_DAYS}, REMOVE_AFTER_DAYS=${REMOVE_AFTER_DAYS}`,
	);

	try {
		// 1. Fetch secrets from AWS Secrets Manager
		const secrets = await fetchSecrets();
		console.log("Successfully fetched secrets from AWS Secrets Manager.");

		// 2. Initialize API clients
		const cursorApi = new CursorAdminApi(secrets.CURSOR_API_KEY);
		const slackApi = new SlackApi(
			secrets.SLACK_BOT_TOKEN,
			secrets.SLACK_SIGNING_SECRET,
		);

		// 3. Fetch team members
		const members = await cursorApi.fetchTeamMembers();
		console.log(`Fetched ${members.length} team members.`);

		if (!members || members.length === 0) {
			console.log("No members found in the Cursor team.");
			return;
		}

		// 4. Get date ranges for both notification and removal periods
		const notifyDateRange = getUsageDataDateRange(NOTIFY_AFTER_DAYS);
		const removeDateRange = getUsageDataDateRange(REMOVE_AFTER_DAYS);

		console.log(
			`Fetching usage data for notification period: last ${NOTIFY_AFTER_DAYS} days (${new Date(notifyDateRange.startDateEpochMs).toISOString()} to ${new Date(notifyDateRange.endDateEpochMs).toISOString()})`,
		);
		console.log(
			`Fetching usage data for removal period: last ${REMOVE_AFTER_DAYS} days (${new Date(removeDateRange.startDateEpochMs).toISOString()} to ${new Date(removeDateRange.endDateEpochMs).toISOString()})`,
		);

		// 5. Fetch daily usage data for both periods
		const [notifyUsageResponse, removeUsageResponse] = await Promise.all([
			cursorApi.fetchDailyUsageData(
				notifyDateRange.startDateEpochMs,
				notifyDateRange.endDateEpochMs,
			),
			cursorApi.fetchDailyUsageData(
				removeDateRange.startDateEpochMs,
				removeDateRange.endDateEpochMs,
			),
		]);

		const notifyUsageData = notifyUsageResponse.data;
		const removeUsageData = removeUsageResponse.data;

		console.log(
			`Fetched ${notifyUsageData.length} usage entries for notification period and ${removeUsageData.length} entries for removal period.`,
		);

		// 6. Categorize inactive users
		const { usersToNotify, usersToRemove } = categorizeInactiveUsers(
			members,
			notifyUsageData,
			removeUsageData,
		);

		console.log(
			`Found ${usersToNotify.length} users to notify and ${usersToRemove.length} users for removal.`,
		);

		// 7. Send individual DMs to users who need notifications
		let dmSuccessCount = 0;
		let dmFailureCount = 0;

		if (usersToNotify.length > 0) {
			console.log("Sending individual DM notifications...");

			const dmPromises = usersToNotify.map(async (user) => {
				const success = await slackApi.sendInactivityWarningDM(
					user.email,
					NOTIFY_AFTER_DAYS,
				);
				if (success) {
					dmSuccessCount++;
				} else {
					dmFailureCount++;
				}
				return success;
			});

			await Promise.all(dmPromises);

			console.log(
				`DM notifications completed: ${dmSuccessCount} successful, ${dmFailureCount} failed.`,
			);
		} else {
			console.log("No users require DM notifications.");
		}

		// 8. Send removal candidates notification to admin (always send, even if DMs failed)
		try {
			if (usersToRemove.length > 0) {
				await slackApi.sendRemovalCandidatesNotification(
					secrets.SLACK_USER_ID,
					usersToRemove,
					REMOVE_AFTER_DAYS,
				);
				console.log(
					"Removal candidates notification sent to admin successfully.",
				);
			} else {
				console.log("No users require removal - no admin notification needed.");
			}
		} catch (error) {
			console.error(
				"Failed to send removal candidates notification to admin (continuing execution):",
				JSON.stringify(error, null, 2),
			);
		}

		// 9. Log final summary
		console.log("Weekly inactive users check completed successfully.");
		console.log(
			`Summary: ${dmSuccessCount} DMs sent, ${dmFailureCount} DMs failed, ${usersToRemove.length} removal candidates reported.`,
		);
	} catch (error) {
		console.error("Error in Lambda handler:", error);
		throw error;
	}
};
