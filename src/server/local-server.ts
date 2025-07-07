import * as dotenv from "dotenv";
import express, {
	type Request,
	type Response,
	type NextFunction,
} from "express";
import { CursorOperations } from "../services/cursor-operations";
import { GitHubOperations } from "../services/github-operations";
import { SlackApi } from "../apis/slack-api";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

interface LocalSecretsData {
	CURSOR_API_KEY?: string;
	GITHUB_TOKEN?: string;
	GITHUB_ORG?: string;
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
		GITHUB_TOKEN,
		GITHUB_ORG,
		SLACK_BOT_TOKEN,
		SLACK_USER_ID,
		SLACK_SIGNING_SECRET,
	} = process.env;

	if (!SLACK_BOT_TOKEN || !SLACK_USER_ID || !SLACK_SIGNING_SECRET) {
		throw new Error(
			"Missing required Slack environment variables: SLACK_BOT_TOKEN, SLACK_USER_ID, SLACK_SIGNING_SECRET",
		);
	}

	return {
		CURSOR_API_KEY,
		GITHUB_TOKEN,
		GITHUB_ORG,
		SLACK_BOT_TOKEN,
		SLACK_USER_ID,
		SLACK_SIGNING_SECRET,
	};
}

/**
 * Main function to check for inactive Cursor users
 */
async function checkInactiveCursorUsers(notifyAfterDays = 60, removeAfterDays = 90) {
	console.log("Starting inactive Cursor users check...");

	try {
		const secrets = loadLocalSecrets();
		if (!secrets.CURSOR_API_KEY) {
			throw new Error("CURSOR_API_KEY environment variable is not set.");
		}

		const cursorOperations = new CursorOperations(secrets.CURSOR_API_KEY);
		const slackApi = new SlackApi(
			secrets.SLACK_BOT_TOKEN,
			secrets.SLACK_SIGNING_SECRET,
		);

		const { usersToNotify, usersToRemove } =
			await cursorOperations.processInactiveUsers(
				notifyAfterDays,
				removeAfterDays,
			);

		if (usersToNotify.length > 0) {
			await slackApi.sendInactivityWarningDM(
				usersToNotify.map(u => u.email).join(','),
				notifyAfterDays,
			);
		}

		if (usersToRemove.length > 0) {
			await slackApi.sendRemovalCandidatesNotification(
				secrets.SLACK_USER_ID,
				usersToRemove,
				removeAfterDays,
			);
		}

		return {
			success: true,
			message: `Cursor check complete. Notified ${usersToNotify.length} users, found ${usersToRemove.length} for removal.`,
			usersToNotify,
			usersToRemove,
		};
	} catch (error) {
		console.error("Error checking inactive Cursor users:", error);
		throw error;
	}
}

/**
 * Main function to check for inactive GitHub Copilot users
 */
async function checkInactiveGitHubUsers(notifyAfterDays = 60, removeAfterDays = 90) {
	console.log("Starting inactive GitHub Copilot users check...");

	try {
		const secrets = loadLocalSecrets();
		if (!secrets.GITHUB_TOKEN || !secrets.GITHUB_ORG) {
			throw new Error(
				"GITHUB_TOKEN and GITHUB_ORG environment variables are not set.",
			);
		}

		const githubOperations = new GitHubOperations(
			secrets.GITHUB_TOKEN,
			secrets.GITHUB_ORG,
		);
		const slackApi = new SlackApi(
			secrets.SLACK_BOT_TOKEN,
			secrets.SLACK_SIGNING_SECRET,
		);

		const { usersToNotify, usersToRemove } =
			await githubOperations.processInactiveUsers(
				notifyAfterDays,
				removeAfterDays,
			);

		if (usersToNotify.length > 0) {
			await slackApi.sendInactivityWarningDM(
				usersToNotify.map(u => u.email).join(','),
				notifyAfterDays,
			);
		}

		if (usersToRemove.length > 0) {
			await slackApi.sendRemovalCandidatesNotification(
				secrets.SLACK_USER_ID,
				usersToRemove,
				removeAfterDays,
			);
		}

		return {
			success: true,
			message: `GitHub Copilot check complete. Notified ${usersToNotify.length} users, found ${usersToRemove.length} for removal.`,
			usersToNotify,
			usersToRemove,
		};
	} catch (error) {
		console.error("Error checking inactive GitHub Copilot users:", error);
		throw error;
	}
}

// Routes
app.get("/", (_req: Request, res: Response) => {
	res.json({
		message: "Cursor Active Users Bot - Local Server",
		endpoints: {
			"GET /": "This help message",
			"POST /check-cursor": "Trigger inactive Cursor users check",
			"POST /check-github": "Trigger inactive GitHub Copilot users check",
			"GET /health": "Health check endpoint",
		},
	});
});

app.get("/health", (_req: Request, res: Response) => {
	res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.post("/check-cursor", async (req: Request, res: Response) => {
	try {
		const { notifyAfterDays, removeAfterDays } = req.body;
		const result = await checkInactiveCursorUsers(
			notifyAfterDays,
			removeAfterDays,
		);
		res.json(result);
	} catch (error) {
		console.error("Error in /check-cursor endpoint:", error);
		res.status(500).json({
			error: "Internal server error",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

app.post("/check-github", async (req: Request, res: Response) => {
	try {
		const { notifyAfterDays, removeAfterDays } = req.body;
		const result = await checkInactiveGitHubUsers(
			notifyAfterDays,
			removeAfterDays,
		);
		res.json(result);
	} catch (error) {
		console.error("Error in /check-github endpoint:", error);
		res.status(500).json({
			error: "Internal server error",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

// Error handling middleware
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
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
		console.log("\nAvailable endpoints:");
		console.log(`  GET  http://localhost:${PORT}/`);
		console.log(`  GET  http://localhost:${PORT}/health`);
		console.log(`  POST http://localhost:${PORT}/check-cursor`);
		console.log(`  POST http://localhost:${PORT}/check-github`);
	});
}

export default app;
