import { GitHubApi, type GitHubCopilotSeat } from "../apis/github-api";
import {
	getUsageDataDateRange,
	type CategorizedInactiveUsers,
} from "./inactive-users-analyzer";
import type { InactiveUser } from "../apis/slack-api";

export interface GitHubOperationsResult {
	seats: GitHubCopilotSeat[];
	usersToNotify: InactiveUser[];
	usersToRemove: InactiveUser[];
}

export interface DateRangeInfo {
	notifyDateRange: { startDateEpochMs: number; endDateEpochMs: number };
	removeDateRange: { startDateEpochMs: number; endDateEpochMs: number };
}

/**
 * Service class for handling GitHub Copilot-related operations
 */
export class GitHubOperations {
	private githubApi: GitHubApi;

	constructor(token: string, organization: string) {
		this.githubApi = new GitHubApi(token, organization);
	}

	/**
	 * Get date ranges for notification and removal periods
	 */
	getDateRanges(
		notifyAfterDays: number,
		removeAfterDays: number,
	): DateRangeInfo {
		const notifyDateRange = getUsageDataDateRange(notifyAfterDays);
		const removeDateRange = getUsageDataDateRange(removeAfterDays);

		console.log(
			`GitHub Copilot: Checking activity for notification period: last ${notifyAfterDays} days (${new Date(notifyDateRange.startDateEpochMs).toISOString()} to ${new Date(notifyDateRange.endDateEpochMs).toISOString()})`,
		);
		console.log(
			`GitHub Copilot: Checking activity for removal period: last ${removeAfterDays} days (${new Date(removeDateRange.startDateEpochMs).toISOString()} to ${new Date(removeDateRange.endDateEpochMs).toISOString()})`,
		);

		return { notifyDateRange, removeDateRange };
	}

	/**
	 * Fetch all Copilot seats from GitHub API
	 */
	async fetchCopilotSeats(): Promise<GitHubCopilotSeat[]> {
		try {
			const seats = await this.githubApi.fetchAllCopilotSeats();
			console.log(`Fetched ${seats.length} GitHub Copilot seats.`);

			if (!seats || seats.length === 0) {
				console.log("No Copilot seats found in the GitHub organization.");
				return [];
			}

			return seats;
		} catch (error) {
			console.error("Error fetching GitHub Copilot seats:", error);
			throw new Error(
				`Failed to fetch GitHub Copilot seats: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Find users who have been inactive during the specified period
	 * @param seats Array of Copilot seats
	 * @param cutoffDateEpochMs Cutoff date in epoch milliseconds
	 * @returns Array of inactive users
	 */
	findInactiveUsers(
		seats: GitHubCopilotSeat[],
		cutoffDateEpochMs: number,
	): InactiveUser[] {
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
		dateRanges: DateRangeInfo,
	): CategorizedInactiveUsers {
		// Find users inactive for notification period
		const usersToNotify = this.findInactiveUsers(
			seats,
			dateRanges.notifyDateRange.startDateEpochMs,
		);

		// Find users inactive for removal period
		const usersToRemove = this.findInactiveUsers(
			seats,
			dateRanges.removeDateRange.startDateEpochMs,
		);

		// Remove users from notification list if they're already in removal list
		const removeEmails = new Set(usersToRemove.map((user) => user.email));
		const filteredUsersToNotify = usersToNotify.filter(
			(user) => !removeEmails.has(user.email),
		);

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
	async processInactiveUsers(
		notifyAfterDays: number,
		removeAfterDays: number,
	): Promise<GitHubOperationsResult> {
		// Get date ranges
		const dateRanges = this.getDateRanges(notifyAfterDays, removeAfterDays);

		// Fetch Copilot seats
		const seats = await this.fetchCopilotSeats();
		if (seats.length === 0) {
			return {
				seats: [],
				usersToNotify: [],
				usersToRemove: [],
			};
		}

		// Categorize inactive users
		const { usersToNotify, usersToRemove } = this.categorizeInactiveUsers(
			seats,
			dateRanges,
		);

		console.log(
			`GitHub Copilot: Found ${usersToNotify.length} users to notify and ${usersToRemove.length} users for removal.`,
		);

		return {
			seats,
			usersToNotify,
			usersToRemove,
		};
	}
}