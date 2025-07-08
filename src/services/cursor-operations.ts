import { CursorAdminApi, type DailyUsageData } from "../apis/cursor-admin-api";
import { SlackApi } from "../apis/slack-api";
import type { User } from "../types/users";
import { getUsageDataDateRange } from "../utils/dates";
import type { EnvData } from "../utils/env";
import type { SecretsData } from "../utils/secrets";

export interface CursorOperationsResult {
	members: User[];
	usersToNotify: User[];
	usersToRemove: User[];
}
export interface CategorizedInactiveUsers {
	usersToNotify: User[];
	usersToRemove: User[];
}

/**
 * Service class for handling Cursor-related operations
 */
export class CursorOperations {
	private cursorApi: CursorAdminApi;
	private slackApi: SlackApi;
	private notifyAfterDays: number;
	private removeAfterDays: number;
	private notificationRecipient: string;
	private notificationsEnabled: boolean;

	constructor(secrets: SecretsData, env: EnvData) {
		this.cursorApi = new CursorAdminApi(secrets.CURSOR_API_KEY);
		this.slackApi = new SlackApi(secrets.SLACK_BOT_TOKEN, secrets.SLACK_SIGNING_SECRET, env.ENABLE_NOTIFICATIONS);
		// Use environment variables for notification and removal periods
		this.notifyAfterDays = env.NOTIFY_AFTER_DAYS || 30; // Default to 30 days if not set
		this.removeAfterDays = env.REMOVE_AFTER_DAYS || 90; // Default to 90 days if not set
		this.notificationRecipient = secrets.SLACK_USER_ID || ""; // Default to empty string if not set
		this.notificationsEnabled = env.ENABLE_NOTIFICATIONS || false; // Default to false if not set
	}

	/**
	 * Find users who have no active entries in the provided usage data
	 * @param members Array of team members
	 * @param usageDataEntries Array of usage data (already filtered by time period)
	 * @returns Array of inactive users
	 */
	findInactiveUsers(members: User[], usageDataEntries: DailyUsageData[]): User[] {
		// Build set of users who have been active
		const activeUserEmails = new Set<string>();

		for (const usageEntry of usageDataEntries) {
			if (usageEntry.email && usageEntry.isActive) {
				activeUserEmails.add(usageEntry.email);
			}
		}

		// Return members who are not in the active set
		return members
			.filter((member) => !activeUserEmails.has(member.email))
			.map((member) => ({
				email: member.email,
				name: member.name,
			}));
	}

	/**
	 * Categorize inactive users into notification and removal candidates
	 * @param members Array of team members
	 * @param notifyPeriodUsage Usage data for notification period
	 * @param removePeriodUsage Usage data for removal period
	 * @returns Categorized inactive users
	 */
	categorizeInactiveUsers(
		members: User[],
		notifyPeriodUsage: DailyUsageData[],
		removePeriodUsage: DailyUsageData[],
	): CategorizedInactiveUsers {
		// Find users inactive for notification period
		const usersToNotify = this.findInactiveUsers(members, notifyPeriodUsage);

		// Find users inactive for removal period
		const usersToRemove = this.findInactiveUsers(members, removePeriodUsage);

		return {
			usersToNotify,
			usersToRemove,
		};
	}

	/**
	 * Process inactive users and categorize them for notifications and removal
	 */
	async processInactiveUsers(): Promise<CursorOperationsResult> {
		// Get date ranges
		const notifyDateRange = getUsageDataDateRange(this.notifyAfterDays);
		const removeDateRange = getUsageDataDateRange(this.removeAfterDays);

		// Fetch team members
		const members = await this.cursorApi.fetchTeamMembers();
		if (members.length === 0) {
			return {
				members: [],
				usersToNotify: [],
				usersToRemove: [],
			};
		}

		// Fetch usage data
		const [notifyUsageData, removeUsageData] = await Promise.all([
			this.cursorApi.fetchDailyUsageData(notifyDateRange.startDateEpochMs, notifyDateRange.endDateEpochMs),
			this.cursorApi.fetchDailyUsageData(removeDateRange.startDateEpochMs, removeDateRange.endDateEpochMs),
		]);

		// Categorize inactive users
		const { usersToNotify, usersToRemove } = this.categorizeInactiveUsers(
			members,
			notifyUsageData.data,
			removeUsageData.data,
		);

		console.log(`Found ${usersToNotify.length} users to notify and ${usersToRemove.length} users for removal.`);

		if (this.notificationsEnabled) {
			for (const user of usersToNotify) {
				await this.slackApi.sendInactivityWarningDM(user.email, this.notifyAfterDays, "Cursor");
			}

			if (usersToRemove.length > 0) {
				await this.slackApi.sendRemovalCandidatesNotification(
					this.notificationRecipient,
					usersToRemove,
					this.removeAfterDays,
					"Cursor",
				);
			}
		}

		return {
			members,
			usersToNotify,
			usersToRemove,
		};
	}
}
