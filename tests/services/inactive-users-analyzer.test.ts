import type {
	CursorUser,
	DailyUsageData,
} from "../../src/services/cursor-admin-api";
import {
	findInactiveUsers,
	getUsageDataDateRange,
} from "../../src/services/inactive-users-analyzer";

describe("InactiveUsersAnalyzer", () => {
	const mockMembers: CursorUser[] = [
		{ name: "Active User", email: "active@example.com", role: "member" },
		{ name: "Inactive User", email: "inactive@example.com", role: "member" },
		{ name: "Partially Active", email: "partial@example.com", role: "owner" },
		{ name: "No Data User", email: "nodata@example.com", role: "member" },
	];

	describe("findInactiveUsers", () => {
		it("should identify inactive users correctly", () => {
			const now = Date.now();
			const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
			const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000;

			const mockUsageData: DailyUsageData[] = [
				{
					date: oneMonthAgo,
					isActive: true,
					email: "active@example.com",
					totalLinesAdded: 100,
					totalLinesDeleted: 50,
					acceptedLinesAdded: 80,
					acceptedLinesDeleted: 30,
					totalApplies: 10,
					totalAccepts: 8,
					totalRejects: 2,
					totalTabsShown: 20,
					totalTabsAccepted: 15,
					composerRequests: 5,
					chatRequests: 10,
					agentRequests: 2,
					cmdkUsages: 8,
					subscriptionIncludedReqs: 15,
					apiKeyReqs: 0,
					usageBasedReqs: 0,
					bugbotUsages: 1,
					mostUsedModel: "gpt-4",
				},
				{
					date: threeMonthsAgo,
					isActive: true,
					email: "inactive@example.com",
					totalLinesAdded: 50,
					totalLinesDeleted: 25,
					acceptedLinesAdded: 40,
					acceptedLinesDeleted: 15,
					totalApplies: 5,
					totalAccepts: 4,
					totalRejects: 1,
					totalTabsShown: 10,
					totalTabsAccepted: 8,
					composerRequests: 2,
					chatRequests: 5,
					agentRequests: 1,
					cmdkUsages: 4,
					subscriptionIncludedReqs: 8,
					apiKeyReqs: 0,
					usageBasedReqs: 0,
					bugbotUsages: 0,
					mostUsedModel: "gpt-3.5-turbo",
				},
				{
					date: oneMonthAgo,
					isActive: false, // User was not active on this day
					email: "partial@example.com",
					totalLinesAdded: 0,
					totalLinesDeleted: 0,
					acceptedLinesAdded: 0,
					acceptedLinesDeleted: 0,
					totalApplies: 0,
					totalAccepts: 0,
					totalRejects: 0,
					totalTabsShown: 0,
					totalTabsAccepted: 0,
					composerRequests: 0,
					chatRequests: 0,
					agentRequests: 0,
					cmdkUsages: 0,
					subscriptionIncludedReqs: 0,
					apiKeyReqs: 0,
					usageBasedReqs: 0,
					bugbotUsages: 0,
					mostUsedModel: "gpt-4",
				},
				// No data for 'nodata@example.com'
			];

			// Filter data to only include last 2 months (simulate what would happen in real usage)
			const { startDateEpochMs } = getUsageDataDateRange(2);
			const filteredUsageData = mockUsageData.filter(
				(data) => data.date >= startDateEpochMs,
			);

			const inactiveUsers = findInactiveUsers(mockMembers, filteredUsageData);

			// Should have 3 inactive users:
			// - 'inactive@example.com' (has data from 3 months ago, but filtered out)
			// - 'partial@example.com' (has recent data but isActive: false)
			// - 'nodata@example.com' (no data at all)
			expect(inactiveUsers).toHaveLength(3);
			expect(inactiveUsers).toContainEqual({
				name: "Inactive User",
				email: "inactive@example.com",
			});
			expect(inactiveUsers).toContainEqual({
				name: "Partially Active",
				email: "partial@example.com",
			});
			expect(inactiveUsers).toContainEqual({
				name: "No Data User",
				email: "nodata@example.com",
			});

			// Active user should not be in the inactive list
			expect(inactiveUsers).not.toContainEqual({
				name: "Active User",
				email: "active@example.com",
			});
		});

		it("should handle empty usage data", () => {
			const inactiveUsers = findInactiveUsers(mockMembers, []);

			// All users should be considered inactive if there's no usage data
			expect(inactiveUsers).toHaveLength(4);
			expect(inactiveUsers.map((u) => u.email)).toEqual([
				"active@example.com",
				"inactive@example.com",
				"partial@example.com",
				"nodata@example.com",
			]);
		});

		it("should handle empty members list", () => {
			const mockUsageData: DailyUsageData[] = [
				{
					date: Date.now(),
					isActive: true,
					email: "nonexistent@example.com",
					totalLinesAdded: 100,
					totalLinesDeleted: 50,
					acceptedLinesAdded: 80,
					acceptedLinesDeleted: 30,
					totalApplies: 10,
					totalAccepts: 8,
					totalRejects: 2,
					totalTabsShown: 20,
					totalTabsAccepted: 15,
					composerRequests: 5,
					chatRequests: 10,
					agentRequests: 2,
					cmdkUsages: 8,
					subscriptionIncludedReqs: 15,
					apiKeyReqs: 0,
					usageBasedReqs: 0,
					bugbotUsages: 1,
					mostUsedModel: "gpt-4",
				},
			];

			const inactiveUsers = findInactiveUsers([], mockUsageData);

			expect(inactiveUsers).toHaveLength(0);
		});

		it("should use custom months threshold correctly", () => {
			const now = Date.now();
			const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000;
			const fiveMonthsAgo = now - 150 * 24 * 60 * 60 * 1000;

			const mockUsageData: DailyUsageData[] = [
				{
					date: threeMonthsAgo,
					isActive: true,
					email: "active@example.com",
					totalLinesAdded: 100,
					totalLinesDeleted: 50,
					acceptedLinesAdded: 80,
					acceptedLinesDeleted: 30,
					totalApplies: 10,
					totalAccepts: 8,
					totalRejects: 2,
					totalTabsShown: 20,
					totalTabsAccepted: 15,
					composerRequests: 5,
					chatRequests: 10,
					agentRequests: 2,
					cmdkUsages: 8,
					subscriptionIncludedReqs: 15,
					apiKeyReqs: 0,
					usageBasedReqs: 0,
					bugbotUsages: 1,
					mostUsedModel: "gpt-4",
				},
				{
					date: fiveMonthsAgo,
					isActive: true,
					email: "inactive@example.com",
					totalLinesAdded: 50,
					totalLinesDeleted: 25,
					acceptedLinesAdded: 40,
					acceptedLinesDeleted: 15,
					totalApplies: 5,
					totalAccepts: 4,
					totalRejects: 1,
					totalTabsShown: 10,
					totalTabsAccepted: 8,
					composerRequests: 2,
					chatRequests: 5,
					agentRequests: 1,
					cmdkUsages: 4,
					subscriptionIncludedReqs: 8,
					apiKeyReqs: 0,
					usageBasedReqs: 0,
					bugbotUsages: 0,
					mostUsedModel: "gpt-3.5-turbo",
				},
			];

			const testUsers = mockMembers.slice(0, 2); // Only first two users

			// With 4 months threshold, filter data to include last 4 months
			const { startDateEpochMs } = getUsageDataDateRange(4);
			const filteredUsageData = mockUsageData.filter(
				(data) => data.date >= startDateEpochMs,
			);

			const inactiveUsersWithLongerThreshold = findInactiveUsers(
				testUsers,
				filteredUsageData,
			);

			// With 4 months threshold:
			// - 'active@example.com' has activity from 3 months ago (within threshold) → active
			// - 'inactive@example.com' has activity from 5 months ago (outside threshold) → inactive
			expect(inactiveUsersWithLongerThreshold).toHaveLength(1);
			expect(inactiveUsersWithLongerThreshold[0].email).toBe(
				"inactive@example.com",
			);
		});
	});

	describe("getUsageDataDateRange", () => {
		it("should calculate correct date range for default 2 months", () => {
			const beforeTest = Date.now();
			const { startDateEpochMs, endDateEpochMs } = getUsageDataDateRange();
			const afterTest = Date.now();

			// End date should be close to now
			expect(endDateEpochMs).toBeGreaterThanOrEqual(beforeTest);
			expect(endDateEpochMs).toBeLessThanOrEqual(afterTest);

			// Start date should be approximately 2 months ago
			const expectedStartDate = new Date();
			expectedStartDate.setMonth(expectedStartDate.getMonth() - 2);
			const tolerance = 1000; // 1 second tolerance

			expect(startDateEpochMs).toBeGreaterThanOrEqual(
				expectedStartDate.getTime() - tolerance,
			);
			expect(startDateEpochMs).toBeLessThanOrEqual(
				expectedStartDate.getTime() + tolerance,
			);
		});

		it("should calculate correct date range for custom months", () => {
			const monthsBack = 6;
			const beforeTest = Date.now();
			const { startDateEpochMs, endDateEpochMs } =
				getUsageDataDateRange(monthsBack);
			const afterTest = Date.now();

			// End date should be close to now
			expect(endDateEpochMs).toBeGreaterThanOrEqual(beforeTest);
			expect(endDateEpochMs).toBeLessThanOrEqual(afterTest);

			// Start date should be approximately 6 months ago
			const expectedStartDate = new Date();
			expectedStartDate.setMonth(expectedStartDate.getMonth() - monthsBack);
			const tolerance = 1000; // 1 second tolerance

			expect(startDateEpochMs).toBeGreaterThanOrEqual(
				expectedStartDate.getTime() - tolerance,
			);
			expect(startDateEpochMs).toBeLessThanOrEqual(
				expectedStartDate.getTime() + tolerance,
			);
		});
	});
});
