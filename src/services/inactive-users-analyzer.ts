import type { CursorUser, DailyUsageData } from "./cursor-admin-api";
import type { InactiveUser } from "./slack-api";

export interface CategorizedInactiveUsers {
	usersToNotify: InactiveUser[];
	usersToRemove: InactiveUser[];
}

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
 * Categorize inactive users into notification and removal candidates
 * @param members Array of team members
 * @param notifyPeriodUsage Usage data for notification period
 * @param removePeriodUsage Usage data for removal period
 * @returns Categorized inactive users
 */
export function categorizeInactiveUsers(
	members: CursorUser[],
	notifyPeriodUsage: DailyUsageData[],
	removePeriodUsage: DailyUsageData[],
): CategorizedInactiveUsers {
	// Find users inactive for notification period
	const usersToNotify = findInactiveUsers(members, notifyPeriodUsage);

	// Find users inactive for removal period
	const usersToRemove = findInactiveUsers(members, removePeriodUsage);

	// testing
	return {
		usersToNotify: [
			{
				email: "pekka.kokkonen@gofore.com",
				name: "Pekka Kokkonen",
			},
		],
		usersToRemove: [
			{
				email: "pekka.kokkonen@gofore.com",
				name: "Pekka Kokkonen",
			},
		],
	};
}

/**
 * Calculate date range for fetching usage data
 * @param daysBack Number of days to go back
 * @returns Object with start and end date in epoch milliseconds
 */
export function getUsageDataDateRange(daysBack: number) {
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - daysBack);
	const endDate = new Date();

	return {
		startDateEpochMs: startDate.getTime(),
		endDateEpochMs: endDate.getTime(),
	};
}
