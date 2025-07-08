import { GitHubApi, type GitHubCopilotSeat } from "../apis/github-api";
import type { SlackApi } from "../apis/slack-api";
import type { User } from "../types/users";
import { type DateRangeInfo, getUsageDataDateRange } from "../utils/dates";
import type { EnvData } from "../utils/env";
import type { SecretsData } from "../utils/secrets";
import type { CategorizedInactiveUsers } from "./cursor-operations";

export interface GitHubOperationsResult {
	seats: GitHubCopilotSeat[];
	usersToNotify: User[];
	usersToRemove: User[];
}

/**
 * Service class for handling GitHub Copilot-related operations
 */
export class GitHubOperations {
	private githubApi: GitHubApi;
	private slackApi: SlackApi;
	private notifyAfterDays: number; // Default notification period in days
	private removeAfterDays: number; // Default removal period in days
	notificationRecipient: string;
	notificationsEnabled: boolean;

	constructor(secrets: SecretsData, env: EnvData, slackApi: SlackApi) {
		this.githubApi = new GitHubApi(secrets.GITHUB_TOKEN, secrets.GITHUB_ORG);
		this.slackApi = slackApi;
		// Use environment variables for notification and removal periods
		this.notifyAfterDays = env.NOTIFY_AFTER_DAYS; // Default to 30 days if not set
		this.removeAfterDays = env.REMOVE_AFTER_DAYS; // Default to 90 days if not set
		this.notificationRecipient = secrets.SLACK_USER_ID; // Default to empty string if not set
		this.notificationsEnabled = env.ENABLE_SLACK_NOTIFICATIONS; // Default to false if not set
	}

	/**
	 * Find users who have been inactive during the specified period
	 * @param seats Array of Copilot seats
	 * @param cutoffDateEpochMs Cutoff date in epoch milliseconds
	 * @returns Array of inactive users
	 */
	findInactiveUsers(seats: GitHubCopilotSeat[], cutoffDateEpochMs: number): User[] {
		const cutoffDate = new Date(cutoffDateEpochMs);

		return seats
			.filter((seat) => {
				// If no last activity, consider inactive
				if (!seat.last_activity_at) {
					return true;
				}

				// Check if last activity is before cutoff date
				const lastActivity = new Date(seat.last_activity_at);
				return lastActivity < cutoffDate;
			})
			.map((seat) => ({
				email: seat.assignee.email || `${seat.assignee.login}@github.local`, // Fallback if email not available
				name: seat.assignee.login, // Use GitHub username as name
			}));
	}

	/**
	 * Categorize inactive users into notification and removal candidates
	 * @param seats Array of Copilot seats
	 * @param dateRanges Date ranges for notification and removal periods
	 * @returns Categorized inactive users
	 */
	categorizeInactiveUsers(
		seats: GitHubCopilotSeat[],
		notifyDateRange: DateRangeInfo,
		removeDateRange: DateRangeInfo,
	): CategorizedInactiveUsers {
		// Find users inactive for notification period
		const usersToNotify = this.findInactiveUsers(seats, notifyDateRange.startDateEpochMs);

		// Find users inactive for removal period
		const usersToRemove = this.findInactiveUsers(seats, removeDateRange.startDateEpochMs);

		// Remove users from notification list if they're already in removal list
		const removeEmails = new Set(usersToRemove.map((user) => user.email));
		const filteredUsersToNotify = usersToNotify.filter((user) => !removeEmails.has(user.email));

		console.log(
			`GitHub Copilot: Found ${filteredUsersToNotify.length} users to notify and ${usersToRemove.length} users for removal.`,
		);

		return {
			usersToNotify: filteredUsersToNotify,
			usersToRemove,
		};
	}

	/**
	 * Process inactive users and categorize them for notifications and removal
	 */
	async processInactiveUsers(): Promise<GitHubOperationsResult> {
		// Get date ranges
		const notifyDateRange = getUsageDataDateRange(this.notifyAfterDays);
		const removeDateRange = getUsageDataDateRange(this.removeAfterDays);

		// Fetch Copilot seats
		const seats = await this.githubApi.fetchAllCopilotSeats();
		if (seats.length === 0) {
			return {
				seats: [],
				usersToNotify: [],
				usersToRemove: [],
			};
		}

		// Categorize inactive users
		const { usersToNotify, usersToRemove } = this.categorizeInactiveUsers(seats, notifyDateRange, removeDateRange);

		console.log(
			`GitHub Copilot: Found ${usersToNotify.length} users to notify and ${usersToRemove.length} users for removal.`,
		);

		if (this.notificationsEnabled) {
			for (const user of usersToNotify) {
				await this.slackApi.sendInactivityWarningDM(user.email, this.notifyAfterDays, "GitHub Copilot");
			}

			if (usersToRemove.length > 0) {
				await this.slackApi.sendChannelNotification(
					this.notificationRecipient,
					usersToNotify,
					usersToRemove,
					"GitHub Copilot",
				);
			}
		}

		return {
			seats,
			usersToNotify,
			usersToRemove,
		};
	}
}
