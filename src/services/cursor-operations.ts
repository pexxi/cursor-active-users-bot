import { CursorAdminApi, type CursorUser } from "../apis/cursor-admin-api";
import {
	categorizeInactiveUsers,
	getUsageDataDateRange,
} from "./inactive-users-analyzer";
import type { InactiveUser } from "../apis/slack-api";

export interface CursorOperationsResult {
	members: CursorUser[];
	usersToNotify: InactiveUser[];
	usersToRemove: InactiveUser[];
}

export interface DateRangeInfo {
	notifyDateRange: { startDateEpochMs: number; endDateEpochMs: number };
	removeDateRange: { startDateEpochMs: number; endDateEpochMs: number };
}

/**
 * Service class for handling Cursor-related operations
 */
export class CursorOperations {
	private cursorApi: CursorAdminApi;

	constructor(apiKey: string) {
		this.cursorApi = new CursorAdminApi(apiKey);
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
			`Fetching usage data for notification period: last ${notifyAfterDays} days (${new Date(notifyDateRange.startDateEpochMs).toISOString()} to ${new Date(notifyDateRange.endDateEpochMs).toISOString()})`,
		);
		console.log(
			`Fetching usage data for removal period: last ${removeAfterDays} days (${new Date(removeDateRange.startDateEpochMs).toISOString()} to ${new Date(removeDateRange.endDateEpochMs).toISOString()})`,
		);

		return { notifyDateRange, removeDateRange };
	}

	/**
	 * Fetch team members from Cursor API
	 */
	async fetchTeamMembers(): Promise<CursorUser[]> {
		try {
			const members = await this.cursorApi.fetchTeamMembers();
			console.log(`Fetched ${members.length} team members.`);

			if (!members || members.length === 0) {
				console.log("No members found in the Cursor team.");
				return [];
			}

			return members;
		} catch (error) {
			console.error("Error fetching team members:", error);
			throw new Error(
				`Failed to fetch team members: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Fetch usage data for both notification and removal periods
	 */
	async fetchUsageData(dateRanges: DateRangeInfo): Promise<{
		notifyUsageData: any[];
		removeUsageData: any[];
	}> {
		try {
			const [notifyUsageResponse, removeUsageResponse] = await Promise.all([
				this.cursorApi.fetchDailyUsageData(
					dateRanges.notifyDateRange.startDateEpochMs,
					dateRanges.notifyDateRange.endDateEpochMs,
				),
				this.cursorApi.fetchDailyUsageData(
					dateRanges.removeDateRange.startDateEpochMs,
					dateRanges.removeDateRange.endDateEpochMs,
				),
			]);

			const notifyUsageData = notifyUsageResponse.data;
			const removeUsageData = removeUsageResponse.data;

			console.log(
				`Fetched ${notifyUsageData.length} usage entries for notification period and ${removeUsageData.length} entries for removal period.`,
			);

			return { notifyUsageData, removeUsageData };
		} catch (error) {
			console.error("Error fetching daily usage data:", error);
			throw new Error(
				`Failed to fetch daily usage data: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Process inactive users and categorize them for notifications and removal
	 */
	async processInactiveUsers(
		notifyAfterDays: number,
		removeAfterDays: number,
	): Promise<CursorOperationsResult> {
		// Get date ranges
		const dateRanges = this.getDateRanges(notifyAfterDays, removeAfterDays);

		// Fetch team members
		const members = await this.fetchTeamMembers();
		if (members.length === 0) {
			return {
				members: [],
				usersToNotify: [],
				usersToRemove: [],
			};
		}

		// Fetch usage data
		const { notifyUsageData, removeUsageData } =
			await this.fetchUsageData(dateRanges);

		// Categorize inactive users
		const { usersToNotify, usersToRemove } = categorizeInactiveUsers(
			members,
			notifyUsageData,
			removeUsageData,
		);

		console.log(
			`Found ${usersToNotify.length} users to notify and ${usersToRemove.length} users for removal.`,
		);

		return {
			members,
			usersToNotify,
			usersToRemove,
		};
	}
}
