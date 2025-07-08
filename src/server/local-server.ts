import express, { type NextFunction, type Request, type Response } from "express";
import { SlackApi } from "../apis/slack-api";
import { CursorOperations } from "../services/cursor-operations";
import { GitHubOperations } from "../services/github-operations";
import { getEnv } from "../utils/env";
import { loadLocalSecrets } from "../utils/secrets";

const env = getEnv(true);
const secrets = loadLocalSecrets();
const slackApi = new SlackApi(secrets.SLACK_BOT_TOKEN, secrets.SLACK_SIGNING_SECRET, env.ENABLE_SLACK_NOTIFICATIONS);
const cursorOperations = new CursorOperations(secrets, env, slackApi);
const githubOperations = new GitHubOperations(secrets, env, slackApi);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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

app.post("/check-cursor", async (_req: Request, res: Response) => {
	try {
		const { usersToNotify, usersToRemove } = await cursorOperations.processInactiveUsers();
		res.json({
			usersToNotify,
			usersToRemove,
		});
	} catch (error) {
		console.error("Error in /check-cursor endpoint:", error);
		res.status(500).json({
			error: "Internal server error",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

app.post("/check-github", async (_req: Request, res: Response) => {
	try {
		const { usersToNotify, usersToRemove } = await githubOperations.processInactiveUsers();
		res.json({
			usersToNotify,
			usersToRemove,
		});
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
