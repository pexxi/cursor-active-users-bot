import * as dotenv from "dotenv";
import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import { CursorAdminApi } from "../apis/cursor-admin-api";
import {
	findInactiveUsers,
	getUsageDataDateRange,
} from "../services/inactive-users-analyzer";
import { SlackApi } from "../apis/slack-api";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

interface LocalSecretsData {
	CURSOR_API_KEY: string;
	SLACK_BOT_TOKEN: string;
	SLACK_USER_ID: string;
	SLACK_SIGNING_SECRET: string;
}

/**
 * Load secrets from environment variables for local development
 */
function loadLocalSecrets(): LocalSecretsData {
	const {
		CURSOR_API_KEY,
		SLACK_BOT_TOKEN,
		SLACK_USER_ID,
		SLACK_SIGNING_SECRET,
	} = process.env;

	if (
		!CURSOR_API_KEY ||
		!SLACK_BOT_TOKEN ||
		!SLACK_USER_ID ||
		!SLACK_SIGNING_SECRET
	) {
		throw new Error(
			"Missing required environment variables: CURSOR_API_KEY, SLACK_BOT_TOKEN, or SLACK_USER_ID",
		);
	}

	console.log("SLACK_SIGNING_SECRET", SLACK_SIGNING_SECRET);
	console.log("SLACK_BOT_TOKEN", SLACK_BOT_TOKEN);

	return {
		CURSOR_API_KEY,
		SLACK_BOT_TOKEN,
		SLACK_USER_ID,
		SLACK_SIGNING_SECRET,
	};
}

/**
 * Main function to check for inactive users (extracted from lambda handler)
 */
async function checkInactiveUsers(monthsBack = 2) {
	console.log("Starting inactive users check...");

	try {
		// 1. Load secrets from environment variables
		const secrets = loadLocalSecrets();
		console.log("Successfully loaded secrets from environment variables.");

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
			return {
				success: true,
				message: "No members found in the Cursor team.",
				inactiveUsers: [],
				totalMembers: 0,
			};
		}

		// 4. Get date range for usage data
		const { startDateEpochMs, endDateEpochMs } =
			getUsageDataDateRange(monthsBack);
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
			console.log(
				`Found ${inactiveUsers.length} inactive users. Slack notification sent.`,
			);
		} else {
			console.log("No inactive users found.");
		}

		return {
			success: true,
			message:
				inactiveUsers.length > 0
					? `Found ${inactiveUsers.length} inactive users. Notification sent to Slack.`
					: "No inactive users found.",
			inactiveUsers,
			totalMembers: members.length,
			monthsBack,
		};
	} catch (error) {
		console.error("Error checking inactive users:", error);
		throw error;
	}
}

// Routes
app.get("/", (req: Request, res: Response) => {
	res.json({
		message: "Cursor Active Users Bot - Local Server",
		endpoints: {
			"GET /": "This help message",
			"POST /check-inactive-users": "Trigger inactive users check",
			"GET /health": "Health check endpoint",
		},
	});
});

app.get("/health", (req: Request, res: Response) => {
	res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.post("/check-inactive-users", async (req: Request, res: Response) => {
	try {
		const { monthsBack } = req.body;
		const months =
			monthsBack && typeof monthsBack === "number" ? monthsBack : 2;

		if (months < 1 || months > 12) {
			res.status(400).json({
				error: "monthsBack must be between 1 and 12",
			});
			return;
		}

		const result = await checkInactiveUsers(months);
		res.json(result);
	} catch (error) {
		console.error("Error in /check-inactive-users endpoint:", error);
		res.status(500).json({
			error: "Internal server error",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
	console.error("Unhandled error:", error);
	res.status(500).json({
		error: "Internal server error",
		message: error.message,
	});
});

// Start server
if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`Cursor Active Users Bot server running on port ${PORT}`);
		console.log(
			`Environment variables loaded: ${!!process.env.CURSOR_API_KEY && !!process.env.SLACK_BOT_TOKEN && !!process.env.SLACK_USER_ID ? "✓" : "✗"}`,
		);
		console.log("\nAvailable endpoints:");
		console.log(`  GET  http://localhost:${PORT}/`);
		console.log(`  GET  http://localhost:${PORT}/health`);
		console.log(`  POST http://localhost:${PORT}/check-inactive-users`);
	});
}

export default app;
