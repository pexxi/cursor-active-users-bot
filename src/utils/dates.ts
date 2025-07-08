export interface DateRangeInfo {
	startDateEpochMs: number;
	endDateEpochMs: number;
}

/**
 * Calculate date range for fetching usage data
 * @param daysBack Number of days to go back
 * @returns Object with start and end date in epoch milliseconds
 */
export function getUsageDataDateRange(daysBack: number): DateRangeInfo {
	if (daysBack < 0 || !Number.isInteger(daysBack)) {
		throw new Error("daysBack must be a non-negative integer");
	}
	const endDate = new Date();
	const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

	return {
		startDateEpochMs: startDate.getTime(),
		endDateEpochMs: endDate.getTime(),
	};
}
