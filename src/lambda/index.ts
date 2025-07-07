import type { Context, ScheduledEvent } from "aws-lambda";
import * as dotenv from "dotenv";
import { CursorOperations } from "../services/cursor-operations";
import { GitHubOperations } from "../services/github-operations";
import { SlackApi, type InactiveUser } from "../apis/slack-api";
import { fetchSecrets } from "../services/secrets";

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
const ENABLE_CURSOR = process.env.ENABLE_CURSOR !== "false"; // Default to true
const ENABLE_GITHUB_COPILOT = process.env.ENABLE_GITHUB_COPILOT === "true"; // Default to false
const GITHUB_ORG = process.env.GITHUB_ORG;

export const handler = async (
	event: ScheduledEvent,
	_context: Context,
): Promise<void> => {
	console.log("Scheduled event received:", JSON.stringify(event, null, 2));
	console.log(
		`Configuration: NOTIFY_AFTER_DAYS=${NOTIFY_AFTER_DAYS}, REMOVE_AFTER_DAYS=${REMOVE_AFTER_DAYS}`,
	);
	console.log(
		`Services enabled: Cursor=${ENABLE_CURSOR}, GitHub Copilot=${ENABLE_GITHUB_COPILOT}`,
	);

	try {
		// 1. Fetch secrets from AWS Secrets Manager
		if (!SECRETS_ARN) {
			throw new Error("Missing SECRETS_ARN environment variable.");
		}
		const secrets = await fetchSecrets(SECRETS_ARN);
		console.log("Successfully fetched secrets from AWS Secrets Manager.");

		// 2. Initialize Slack API client
		const slackApi = new SlackApi(
			secrets.SLACK_BOT_TOKEN,
			secrets.SLACK_SIGNING_SECRET,
		);

		// 3. Collect all inactive users from enabled services
		const allUsersToNotify: InactiveUser[] = [];
		const allUsersToRemove: InactiveUser[] = [];
		let totalMembers = 0;

		// Process Cursor users if enabled
		if (ENABLE_CURSOR) {
			console.log("Processing Cursor inactive users...");
			try {
				if (!secrets.CURSOR_API_KEY) {
					throw new Error("CURSOR_API_KEY secret is required when ENABLE_CURSOR is true");
				}

				const cursorOperations = new CursorOperations(secrets.CURSOR_API_KEY);
				const { members, usersToNotify, usersToRemove } =
					await cursorOperations.processInactiveUsers(
						NOTIFY_AFTER_DAYS,
						REMOVE_AFTER_DAYS,
					);

				totalMembers += members.length;
				allUsersToNotify.push(...usersToNotify);
				allUsersToRemove.push(...usersToRemove);

				console.log(
					`Cursor: ${members.length} members, ${usersToNotify.length} to notify, ${usersToRemove.length} to remove`,
				);
			} catch (error) {
				console.error("Error processing Cursor users:", error);
				// Continue with other services even if Cursor fails
			}
		} else {
			console.log("Cursor processing disabled.");
		}

		// Process GitHub Copilot users if enabled
		if (ENABLE_GITHUB_COPILOT) {
			console.log("Processing GitHub Copilot inactive users...");
			try {
				if (!GITHUB_ORG) {
					throw new Error("GITHUB_ORG environment variable is required when ENABLE_GITHUB_COPILOT is true");
				}
				if (!secrets.GITHUB_TOKEN) {
					throw new Error("GITHUB_TOKEN secret is required when ENABLE_GITHUB_COPILOT is true");
				}

				const githubOperations = new GitHubOperations(
					secrets.GITHUB_TOKEN,
					GITHUB_ORG,
				);
				const { seats, usersToNotify, usersToRemove } =
					await githubOperations.processInactiveUsers(
						NOTIFY_AFTER_DAYS,
						REMOVE_AFTER_DAYS,
					);

				totalMembers += seats.length;
				allUsersToNotify.push(...usersToNotify);
				allUsersToRemove.push(...usersToRemove);

				console.log(
					`GitHub Copilot: ${seats.length} seats, ${usersToNotify.length} to notify, ${usersToRemove.length} to remove`,
				);
			} catch (error) {
				console.error("Error processing GitHub Copilot users:", error);
				// Continue with other services even if GitHub fails
			}
		} else {
			console.log("GitHub Copilot processing disabled.");
		}

		// Check if any services were enabled and processed
		if (!ENABLE_CURSOR && !ENABLE_GITHUB_COPILOT) {
			console.log("No services enabled. Please enable at least one service (ENABLE_CURSOR or ENABLE_GITHUB_COPILOT).");
			return;
		}

		if (totalMembers === 0) {
			console.log("No members found across all enabled services.");
			return;
		}

		// Remove duplicates based on email (in case user appears in both services)
		const uniqueUsersToNotify = Array.from(
			new Map(allUsersToNotify.map(user => [user.email, user])).values()
		);
		const uniqueUsersToRemove = Array.from(
			new Map(allUsersToRemove.map(user => [user.email, user])).values()
		);

		console.log(
			`Total unique users: ${uniqueUsersToNotify.length} to notify, ${uniqueUsersToRemove.length} to remove`,
		);

		// 4. Send individual DMs to users who need notifications
		let dmSuccessCount = 0;
		let dmFailureCount = 0;

		if (uniqueUsersToNotify.length > 0) {
			console.log("Sending individual DM notifications...");

			const dmResults = await Promise.allSettled(
				uniqueUsersToNotify.map((user: InactiveUser) =>
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
			if (uniqueUsersToRemove.length > 0) {
				await slackApi.sendRemovalCandidatesNotification(
					secrets.SLACK_USER_ID,
					uniqueUsersToRemove,
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
			`Summary: ${dmSuccessCount} DMs sent, ${dmFailureCount} DMs failed, ${uniqueUsersToRemove.length} removal candidates reported.`,
		);
	} catch (error) {
		console.error("Error in Lambda handler:", error);
		throw error;
	}
};
