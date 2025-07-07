import axios from "axios";
import {
	CursorAdminApi,
	type CursorDailyUsageResponse,
	type CursorTeamMembersResponse,
	type CursorUser,
} from "../../src/apis/cursor-admin-api";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("CursorAdminApi", () => {
	let api: CursorAdminApi;
	const mockApiKey = "test-api-key";

	beforeEach(() => {
		api = new CursorAdminApi(mockApiKey);
		jest.clearAllMocks();
	});

	describe("fetchTeamMembers", () => {
		it("should fetch team members successfully", async () => {
			const mockMembers: CursorUser[] = [
				{ name: "John Doe", email: "john@example.com", role: "owner" },
				{ name: "Jane Smith", email: "jane@example.com", role: "member" },
				{ name: "Bob Wilson", email: "bob@example.com", role: "member" },
			];

			const mockResponse: CursorTeamMembersResponse = {
				teamMembers: mockMembers,
			};

			mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

			const result = await api.fetchTeamMembers();

			// Should only return members with role "member", filtering out "owner"
			expect(result).toEqual([
				{ name: "Jane Smith", email: "jane@example.com", role: "member" },
				{ name: "Bob Wilson", email: "bob@example.com", role: "member" },
			]);
			expect(mockedAxios.get).toHaveBeenCalledWith(
				"https://api.cursor.com/teams/members",
				{
					auth: {
						username: mockApiKey,
						password: "",
					},
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		});

		it("should handle API errors gracefully", async () => {
			const mockError = new Error("API Error");
			mockedAxios.get.mockRejectedValueOnce(mockError);

			await expect(api.fetchTeamMembers()).rejects.toThrow("API Error");
		});

		it("should handle axios errors with response data", async () => {
			const mockError = {
				isAxiosError: true,
				response: {
					data: { error: "Unauthorized" },
				},
			};
			mockedAxios.get.mockRejectedValueOnce(mockError);
			mockedAxios.isAxiosError.mockReturnValueOnce(true);

			const consoleSpy = jest.spyOn(console, "error").mockImplementation();

			await expect(api.fetchTeamMembers()).rejects.toEqual(mockError);
			expect(consoleSpy).toHaveBeenCalledWith("API error details:", {
				error: "Unauthorized",
			});

			consoleSpy.mockRestore();
		});
	});

	describe("fetchDailyUsageData", () => {
		const startDate = 1640995200000; // Jan 1, 2022
		const endDate = 1672531200000; // Jan 1, 2023

		it("should fetch daily usage data successfully", async () => {
			const mockResponse: CursorDailyUsageResponse = {
				data: [
					{
						date: 1640995200000,
						isActive: true,
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
						email: "user@example.com",
					},
				],
				period: {
					startDate,
					endDate,
				},
			};

			mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

			const result = await api.fetchDailyUsageData(startDate, endDate);

			expect(result).toEqual(mockResponse);
			expect(mockedAxios.post).toHaveBeenCalledWith(
				"https://api.cursor.com/teams/daily-usage-data",
				{
					startDate,
					endDate,
				},
				{
					auth: {
						username: mockApiKey,
						password: "",
					},
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		});

		it("should handle API errors gracefully", async () => {
			const mockError = new Error("Usage API Error");
			mockedAxios.post.mockRejectedValueOnce(mockError);

			await expect(api.fetchDailyUsageData(startDate, endDate)).rejects.toThrow(
				"Usage API Error",
			);
		});
	});
});
