import type {
	CursorUser,
	DailyUsageData,
} from "../../src/services/cursor-admin-api";
import {
	findInactiveUsers,
	getUsageDataDateRange,
	categorizeInactiveUsers,
	type CategorizedInactiveUsers,
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

			// Filter data to only include last 60 days (simulate what would happen in real usage)
			const { startDateEpochMs } = getUsageDataDateRange(60);
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

		it("should use custom days threshold correctly", () => {
			const now = Date.now();
			const nineDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
			const oneHundredFiftyDaysAgo = now - 150 * 24 * 60 * 60 * 1000;

			const mockUsageData: DailyUsageData[] = [
				{
					date: nineDaysAgo,
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
					date: oneHundredFiftyDaysAgo,
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

			// With 120 days threshold, filter data to include last 120 days
			const { startDateEpochMs } = getUsageDataDateRange(120);
			const filteredUsageData = mockUsageData.filter(
				(data) => data.date >= startDateEpochMs,
			);

			const inactiveUsersWithLongerThreshold = findInactiveUsers(
				testUsers,
				filteredUsageData,
			);

			// With 120 days threshold:
			// - 'active@example.com' has activity from 90 days ago (within threshold) → active
			// - 'inactive@example.com' has activity from 150 days ago (outside threshold) → inactive
			expect(inactiveUsersWithLongerThreshold).toHaveLength(1);
			expect(inactiveUsersWithLongerThreshold[0].email).toBe(
				"inactive@example.com",
			);
		});
	});

	describe("getUsageDataDateRange", () => {
		it("should calculate correct date range for 60 days", () => {
			const beforeTest = Date.now();
			const { startDateEpochMs, endDateEpochMs } = getUsageDataDateRange(60);
			const afterTest = Date.now();

			// End date should be close to now
			expect(endDateEpochMs).toBeGreaterThanOrEqual(beforeTest);
			expect(endDateEpochMs).toBeLessThanOrEqual(afterTest);

			// Start date should be approximately 60 days ago
			const expectedStartDate = new Date();
			expectedStartDate.setDate(expectedStartDate.getDate() - 60);
			const tolerance = 1000; // 1 second tolerance

			expect(startDateEpochMs).toBeGreaterThanOrEqual(
				expectedStartDate.getTime() - tolerance,
			);
			expect(startDateEpochMs).toBeLessThanOrEqual(
				expectedStartDate.getTime() + tolerance,
			);
		});

		it("should calculate correct date range for custom days", () => {
			const daysBack = 180;
			const beforeTest = Date.now();
			const { startDateEpochMs, endDateEpochMs } =
				getUsageDataDateRange(daysBack);
			const afterTest = Date.now();

			// End date should be close to now
			expect(endDateEpochMs).toBeGreaterThanOrEqual(beforeTest);
			expect(endDateEpochMs).toBeLessThanOrEqual(afterTest);

			// Start date should be approximately 180 days ago
			const expectedStartDate = new Date();
			expectedStartDate.setDate(expectedStartDate.getDate() - daysBack);
			const tolerance = 1000; // 1 second tolerance

			expect(startDateEpochMs).toBeGreaterThanOrEqual(
				expectedStartDate.getTime() - tolerance,
			);
			expect(startDateEpochMs).toBeLessThanOrEqual(
				expectedStartDate.getTime() + tolerance,
			);
		});
	});

	describe("categorizeInactiveUsers", () => {
		it("should correctly categorize users into notify and remove groups", () => {
			const now = Date.now();
			const fiftyDaysAgo = now - 50 * 24 * 60 * 60 * 1000;
			const seventyDaysAgo = now - 70 * 24 * 60 * 60 * 1000;
			const oneHundredDaysAgo = now - 100 * 24 * 60 * 60 * 1000;

			// Usage data for notification period (60 days)
			const notifyPeriodUsage: DailyUsageData[] = [
				{
					date: fiftyDaysAgo,
					isActive: true,
					email: "recently-active@example.com",
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

			// Usage data for removal period (90 days)
			const removePeriodUsage: DailyUsageData[] = [
				{
					date: fiftyDaysAgo,
					isActive: true,
					email: "recently-active@example.com",
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
					date: seventyDaysAgo,
					isActive: true,
					email: "moderately-inactive@example.com",
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

			const testUsers: CursorUser[] = [
				{
					name: "Recently Active",
					email: "recently-active@example.com",
					role: "member",
				},
				{
					name: "Moderately Inactive",
					email: "moderately-inactive@example.com",
					role: "member",
				},
				{
					name: "Very Inactive",
					email: "very-inactive@example.com",
					role: "member",
				},
			];

			const result = categorizeInactiveUsers(
				testUsers,
				notifyPeriodUsage,
				removePeriodUsage,
			);

			// recently-active@example.com should not be in either list (active within 60 days)
			expect(result.usersToNotify).not.toContainEqual({
				name: "Recently Active",
				email: "recently-active@example.com",
			});
			expect(result.usersToRemove).not.toContainEqual({
				name: "Recently Active",
				email: "recently-active@example.com",
			});

			// moderately-inactive@example.com should be in usersToNotify but not usersToRemove
			// (inactive for 60+ days but active within 90 days)
			expect(result.usersToNotify).toContainEqual({
				name: "Moderately Inactive",
				email: "moderately-inactive@example.com",
			});
			expect(result.usersToRemove).not.toContainEqual({
				name: "Moderately Inactive",
				email: "moderately-inactive@example.com",
			});

			// very-inactive@example.com should be in both lists (no activity in either period)
			expect(result.usersToNotify).toContainEqual({
				name: "Very Inactive",
				email: "very-inactive@example.com",
			});
			expect(result.usersToRemove).toContainEqual({
				name: "Very Inactive",
				email: "very-inactive@example.com",
			});

			expect(result.usersToNotify).toHaveLength(2);
			expect(result.usersToRemove).toHaveLength(1);
		});

		it("should handle empty usage data", () => {
			const testUsers: CursorUser[] = [
				{ name: "User One", email: "user1@example.com", role: "member" },
				{ name: "User Two", email: "user2@example.com", role: "member" },
			];

			const result = categorizeInactiveUsers(testUsers, [], []);

			// All users should be in both categories when there's no usage data
			expect(result.usersToNotify).toHaveLength(2);
			expect(result.usersToRemove).toHaveLength(2);
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

			const result = categorizeInactiveUsers([], mockUsageData, mockUsageData);

			expect(result.usersToNotify).toHaveLength(0);
			expect(result.usersToRemove).toHaveLength(0);
		});
	});
});
