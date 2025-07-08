import type { Context, ScheduledEvent } from "aws-lambda";
import * as dotenv from "dotenv";
import { SlackApi } from "../apis/slack-api";
import { CursorOperations } from "../services/cursor-operations";
import { GitHubOperations } from "../services/github-operations";
import { getEnv } from "../utils/env";
import { fetchSecrets } from "../utils/secrets";

dotenv.config();

export const handler = async (event: ScheduledEvent, _context: Context): Promise<void> => {
	try {
		const env = getEnv();

		console.log("Scheduled event received:", JSON.stringify(event, null, 2));
		console.log(
			`Configuration: NOTIFY_AFTER_DAYS=${env.NOTIFY_AFTER_DAYS}, REMOVE_AFTER_DAYS=${env.REMOVE_AFTER_DAYS}`,
		);
		console.log(`Services enabled: Cursor=${env.ENABLE_CURSOR}, GitHub Copilot=${env.ENABLE_GITHUB_COPILOT}`);

		const secrets = await fetchSecrets();
		const slackApi = new SlackApi(
			secrets.SLACK_BOT_TOKEN,
			secrets.SLACK_SIGNING_SECRET,
			env.ENABLE_SLACK_NOTIFICATIONS,
		);

		// Process Cursor users if enabled§
		if (env.ENABLE_CURSOR) {
			console.log("Processing Cursor inactive users...");

			const cursorOperations = new CursorOperations(secrets, env, slackApi);
			await cursorOperations.processInactiveUsers();
		} else {
			console.log("Cursor processing disabled.");
		}

		// Process GitHub Copilot users if enabled
		if (env.ENABLE_GITHUB_COPILOT) {
			console.log("Processing GitHub Copilot inactive users...");
			const githubOperations = new GitHubOperations(secrets, env, slackApi);
			await githubOperations.processInactiveUsers();
		} else {
			console.log("GitHub Copilot processing disabled.");
		}
	} catch (error) {
		console.error("Error in Lambda handler:", error);
		throw error;
	}
};
