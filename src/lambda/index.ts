import type { Context, ScheduledEvent } from "aws-lambda";
import * as dotenv from "dotenv";
import { CursorOperations } from "../services/cursor-operations";
import { SlackApi, type InactiveUser } from "../apis/slack-api";
import { fetchSecrets } from "../services/services";

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
		if (!SECRETS_ARN) {
			throw new Error("Missing SECRETS_ARN environment variable.");
		}
		const secrets = await fetchSecrets(SECRETS_ARN);
		console.log("Successfully fetched secrets from AWS Secrets Manager.");

		// 2. Initialize API clients
		const cursorOperations = new CursorOperations(secrets.CURSOR_API_KEY);
		const slackApi = new SlackApi(
			secrets.SLACK_BOT_TOKEN,
			secrets.SLACK_SIGNING_SECRET,
		);

		// 3. Process inactive users using Cursor operations
		const { members, usersToNotify, usersToRemove } =
			await cursorOperations.processInactiveUsers(
				NOTIFY_AFTER_DAYS,
				REMOVE_AFTER_DAYS,
			);

		if (members.length === 0) {
			console.log("No members found in the Cursor team.");
			return;
		}

		// 4. Send individual DMs to users who need notifications
		let dmSuccessCount = 0;
		let dmFailureCount = 0;

		if (usersToNotify.length > 0) {
			console.log("Sending individual DM notifications...");

			const dmResults = await Promise.allSettled(
				usersToNotify.map((user: InactiveUser) =>
					slackApi.sendInactivityWarningDM(user.email, NOTIFY_AFTER_DAYS),
				),
			);
			dmSuccessCount = dmResults.filter(
				(result: PromiseSettledResult<boolean>) =>
					result.status === "fulfilled" && result.value === true,
			).length;
			dmFailureCount = dmResults.length - dmSuccessCount;

			console.log(
				`DM notifications completed: ${dmSuccessCount} successful, ${dmFailureCount} failed.`,
			);
		} else {
			console.log("No users require DM notifications.");
		}

		// 5. Send removal candidates notification to admin (always send, even if DMs failed)
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

		// 6. Log final summary
		console.log("Weekly inactive users check completed successfully.");
		console.log(
			`Summary: ${dmSuccessCount} DMs sent, ${dmFailureCount} DMs failed, ${usersToRemove.length} removal candidates reported.`,
		);
	} catch (error) {
		console.error("Error in Lambda handler:", error);
		throw error;
	}
};
