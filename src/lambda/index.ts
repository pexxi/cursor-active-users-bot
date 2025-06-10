import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type { Context, ScheduledEvent } from "aws-lambda";
import * as dotenv from "dotenv";
import { CursorAdminApi } from "../services/cursor-admin-api";
import {
	findInactiveUsers,
	getUsageDataDateRange,
} from "../services/inactive-users-analyzer";
import { SlackApi } from "../services/slack-api";

dotenv.config();

const SECRETS_ARN = process.env.SECRETS_ARN; // Name or ARN of the secret in AWS Secrets Manager

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

		// 4. Get date range for usage data (last 2 months)
		const { startDateEpochMs, endDateEpochMs } = getUsageDataDateRange(2);
		console.log(
			`Fetching daily usage data from ${new Date(startDateEpochMs).toISOString()} to ${new Date(endDateEpochMs).toISOString()}`,
		);

		// 5. Fetch daily usage data
		const dailyUsageResponse = await cursorApi.fetchDailyUsageData(
			startDateEpochMs,
			endDateEpochMs,
		);
		const usageDataEntries = dailyUsageResponse.data;
		console.log(
			`Fetched ${usageDataEntries.length} daily usage entries for the team.`,
		);

		// 6. Find inactive users
		const inactiveUsers = findInactiveUsers(members, usageDataEntries);

		// 7. Send Slack notification if inactive users found
		if (inactiveUsers.length > 0) {
			await slackApi.sendInactiveUsersNotification(
				secrets.SLACK_USER_ID,
				inactiveUsers,
			);
		} else {
			console.log("No inactive users found.");
		}
	} catch (error) {
		console.error("Error in Lambda handler:", error);
		throw error;
	}
};
