import express, { type NextFunction, type Request, type Response } from "express";
import { CursorOperations } from "../services/cursor-operations";
import { GitHubOperations } from "../services/github-operations";
import { getEnv } from "../utils/env";
import { loadLocalSecrets } from "../utils/secrets";

const env = getEnv(true);
const secrets = loadLocalSecrets();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/**
 * Main function to check for inactive Cursor users
 */
async function checkInactiveCursorUsers() {
	console.log("Starting inactive Cursor users check...");

	try {
		const cursorOperations = new CursorOperations(secrets, env);
		const { usersToNotify, usersToRemove } = await cursorOperations.processInactiveUsers();

		return {
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
async function checkInactiveGitHubUsers() {
	console.log("Starting inactive GitHub Copilot users check...");

	try {
		const githubOperations = new GitHubOperations(secrets, env);
		const { usersToNotify, usersToRemove } = await githubOperations.processInactiveUsers();

		return {
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

app.post("/check-cursor", async (_req: Request, res: Response) => {
	try {
		const result = await checkInactiveCursorUsers();
		res.json(result);
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
		const result = await checkInactiveGitHubUsers();
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
