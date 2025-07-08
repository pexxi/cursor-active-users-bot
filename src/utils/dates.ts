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
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - daysBack);
	const endDate = new Date();

	return {
		startDateEpochMs: startDate.getTime(),
		endDateEpochMs: endDate.getTime(),
	};
}
