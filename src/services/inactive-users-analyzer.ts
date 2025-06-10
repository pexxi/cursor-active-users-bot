import type { CursorUser, DailyUsageData } from "./cursor-admin-api";
import type { InactiveUser } from "./slack-api";

/**
 * Find users who have no active entries in the provided usage data
 * @param members Array of team members
 * @param usageDataEntries Array of usage data (already filtered by time period)
 * @returns Array of inactive users
 */
export function findInactiveUsers(
	members: CursorUser[],
	usageDataEntries: DailyUsageData[],
): InactiveUser[] {
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
 * Calculate date range for fetching usage data
 * @param monthsBack Number of months to go back (default: 2)
 * @returns Object with start and end date in epoch milliseconds
 */
export function getUsageDataDateRange(monthsBack = 2) {
	const startDate = new Date();
	startDate.setMonth(startDate.getMonth() - monthsBack);
	const endDate = new Date();

	return {
		startDateEpochMs: startDate.getTime(),
		endDateEpochMs: endDate.getTime(),
	};
}
