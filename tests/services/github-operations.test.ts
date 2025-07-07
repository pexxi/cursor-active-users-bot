import { GitHubOperations } from "../../src/services/github-operations";
import { GitHubApi, type GitHubCopilotSeat } from "../../src/apis/github-api";

// Mock the GitHubApi
jest.mock("../../src/apis/github-api");
const MockedGitHubApi = GitHubApi as jest.MockedClass<typeof GitHubApi>;

describe("GitHubOperations", () => {
	let githubOperations: GitHubOperations;
	let mockGitHubApi: jest.Mocked<GitHubApi>;
	const mockToken = "test-token";
	const mockOrg = "test-org";

	beforeEach(() => {
		jest.clearAllMocks();
		mockGitHubApi = {
			fetchAllCopilotSeats: jest.fn(),
			fetchCopilotSeats: jest.fn(),
			fetchUserCopilotSeat: jest.fn(),
		} as unknown as jest.Mocked<GitHubApi>;
		MockedGitHubApi.mockImplementation(() => mockGitHubApi);
		githubOperations = new GitHubOperations(mockToken, mockOrg);
	});

	describe("getDateRanges", () => {
		it("should calculate correct date ranges", () => {
			const notifyAfterDays = 60;
			const removeAfterDays = 90;

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const result = githubOperations.getDateRanges(
				notifyAfterDays,
				removeAfterDays,
			);

			expect(result).toHaveProperty("notifyDateRange");
			expect(result).toHaveProperty("removeDateRange");
			expect(result.notifyDateRange).toHaveProperty("startDateEpochMs");
			expect(result.notifyDateRange).toHaveProperty("endDateEpochMs");
			expect(result.removeDateRange).toHaveProperty("startDateEpochMs");
			expect(result.removeDateRange).toHaveProperty("endDateEpochMs");

			// Verify that notify period is more recent than remove period
			expect(result.notifyDateRange.startDateEpochMs).toBeGreaterThan(
				result.removeDateRange.startDateEpochMs,
			);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("GitHub Copilot: Checking activity for notification period"),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("GitHub Copilot: Checking activity for removal period"),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("fetchCopilotSeats", () => {
		it("should fetch Copilot seats successfully", async () => {
			const mockSeats: GitHubCopilotSeat[] = [
				{
					created_at: "2021-08-03T18:00:00-06:00",
					updated_at: "2021-09-23T15:00:00-06:00",
					pending_cancellation_date: null,
					last_activity_at: "2021-10-14T00:53:32-06:00",
					last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
					plan_type: "business",
					assignee: {
						login: "testuser",
						id: 1,
						node_id: "MDQ6VXNlcjE=",
						avatar_url: "https://github.com/images/error/testuser.gif",
						gravatar_id: "",
						url: "https://api.github.com/users/testuser",
						html_url: "https://github.com/testuser",
						followers_url: "https://api.github.com/users/testuser/followers",
						following_url: "https://api.github.com/users/testuser/following{/other_user}",
						gists_url: "https://api.github.com/users/testuser/gists{/gist_id}",
						starred_url: "https://api.github.com/users/testuser/starred{/owner}{/repo}",
						subscriptions_url: "https://api.github.com/users/testuser/subscriptions",
						organizations_url: "https://api.github.com/users/testuser/orgs",
						repos_url: "https://api.github.com/users/testuser/repos",
						events_url: "https://api.github.com/users/testuser/events{/privacy}",
						received_events_url: "https://api.github.com/users/testuser/received_events",
						type: "User",
						site_admin: false,
						email: "testuser@example.com",
					},
				},
			];

			mockGitHubApi.fetchAllCopilotSeats.mockResolvedValueOnce(mockSeats);

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const result = await githubOperations.fetchCopilotSeats();

			expect(result).toEqual(mockSeats);
			expect(mockGitHubApi.fetchAllCopilotSeats).toHaveBeenCalledTimes(1);
			expect(consoleSpy).toHaveBeenCalledWith("Fetched 1 GitHub Copilot seats.");

			consoleSpy.mockRestore();
		});

		it("should handle empty seats response", async () => {
			mockGitHubApi.fetchAllCopilotSeats.mockResolvedValueOnce([]);

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const result = await githubOperations.fetchCopilotSeats();

			expect(result).toEqual([]);
			expect(consoleSpy).toHaveBeenCalledWith(
				"No Copilot seats found in the GitHub organization.",
			);

			consoleSpy.mockRestore();
		});

		it("should handle API errors", async () => {
			const mockError = new Error("API Error");
			mockGitHubApi.fetchAllCopilotSeats.mockRejectedValueOnce(mockError);

			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

			await expect(githubOperations.fetchCopilotSeats()).rejects.toThrow(
				"Failed to fetch GitHub Copilot seats: API Error",
			);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Error fetching GitHub Copilot seats:",
				mockError,
			);

			consoleErrorSpy.mockRestore();
		});
	});

	describe("findInactiveUsers", () => {
		const mockSeats: GitHubCopilotSeat[] = [
			{
				created_at: "2021-08-03T18:00:00-06:00",
				updated_at: "2021-09-23T15:00:00-06:00",
				pending_cancellation_date: null,
				last_activity_at: "2023-01-01T00:00:00Z", // Recent activity
				last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
				plan_type: "business",
				assignee: {
					login: "activeuser",
					id: 1,
					node_id: "MDQ6VXNlcjE=",
					avatar_url: "https://github.com/images/error/activeuser.gif",
					gravatar_id: "",
					url: "https://api.github.com/users/activeuser",
					html_url: "https://github.com/activeuser",
					followers_url: "https://api.github.com/users/activeuser/followers",
					following_url: "https://api.github.com/users/activeuser/following{/other_user}",
					gists_url: "https://api.github.com/users/activeuser/gists{/gist_id}",
					starred_url: "https://api.github.com/users/activeuser/starred{/owner}{/repo}",
					subscriptions_url: "https://api.github.com/users/activeuser/subscriptions",
					organizations_url: "https://api.github.com/users/activeuser/orgs",
					repos_url: "https://api.github.com/users/activeuser/repos",
					events_url: "https://api.github.com/users/activeuser/events{/privacy}",
					received_events_url: "https://api.github.com/users/activeuser/received_events",
					type: "User",
					site_admin: false,
					email: "activeuser@example.com",
				},
			},
			{
				created_at: "2021-08-03T18:00:00-06:00",
				updated_at: "2021-09-23T15:00:00-06:00",
				pending_cancellation_date: null,
				last_activity_at: "2020-01-01T00:00:00Z", // Old activity
				last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
				plan_type: "business",
				assignee: {
					login: "inactiveuser",
					id: 2,
					node_id: "MDQ6VXNlcjI=",
					avatar_url: "https://github.com/images/error/inactiveuser.gif",
					gravatar_id: "",
					url: "https://api.github.com/users/inactiveuser",
					html_url: "https://github.com/inactiveuser",
					followers_url: "https://api.github.com/users/inactiveuser/followers",
					following_url: "https://api.github.com/users/inactiveuser/following{/other_user}",
					gists_url: "https://api.github.com/users/inactiveuser/gists{/gist_id}",
					starred_url: "https://api.github.com/users/inactiveuser/starred{/owner}{/repo}",
					subscriptions_url: "https://api.github.com/users/inactiveuser/subscriptions",
					organizations_url: "https://api.github.com/users/inactiveuser/orgs",
					repos_url: "https://api.github.com/users/inactiveuser/repos",
					events_url: "https://api.github.com/users/inactiveuser/events{/privacy}",
					received_events_url: "https://api.github.com/users/inactiveuser/received_events",
					type: "User",
					site_admin: false,
					email: "inactiveuser@example.com",
				},
			},
			{
				created_at: "2021-08-03T18:00:00-06:00",
				updated_at: "2021-09-23T15:00:00-06:00",
				pending_cancellation_date: null,
				last_activity_at: null, // No activity
				last_activity_editor: null,
				plan_type: "business",
				assignee: {
					login: "neveractiveuser",
					id: 3,
					node_id: "MDQ6VXNlcjM=",
					avatar_url: "https://github.com/images/error/neveractiveuser.gif",
					gravatar_id: "",
					url: "https://api.github.com/users/neveractiveuser",
					html_url: "https://github.com/neveractiveuser",
					followers_url: "https://api.github.com/users/neveractiveuser/followers",
					following_url: "https://api.github.com/users/neveractiveuser/following{/other_user}",
					gists_url: "https://api.github.com/users/neveractiveuser/gists{/gist_id}",
					starred_url: "https://api.github.com/users/neveractiveuser/starred{/owner}{/repo}",
					subscriptions_url: "https://api.github.com/users/neveractiveuser/subscriptions",
					organizations_url: "https://api.github.com/users/neveractiveuser/orgs",
					repos_url: "https://api.github.com/users/neveractiveuser/repos",
					events_url: "https://api.github.com/users/neveractiveuser/events{/privacy}",
					received_events_url: "https://api.github.com/users/neveractiveuser/received_events",
					type: "User",
					site_admin: false,
				},
			},
		];

		it("should identify inactive users correctly", () => {
			const cutoffDate = new Date("2022-01-01T00:00:00Z").getTime();

			const result = githubOperations.findInactiveUsers(mockSeats, cutoffDate);

			expect(result).toHaveLength(2);
			expect(result).toEqual([
				{
					email: "inactiveuser@example.com",
					name: "inactiveuser",
				},
				{
					email: "neveractiveuser@github.local", // Fallback email
					name: "neveractiveuser",
				},
			]);
		});

		it("should handle users without email addresses", () => {
			const cutoffDate = new Date("2022-01-01T00:00:00Z").getTime();

			const result = githubOperations.findInactiveUsers(mockSeats, cutoffDate);

			// Check that user without email gets fallback email
			const userWithoutEmail = result.find(user => user.name === "neveractiveuser");
			expect(userWithoutEmail?.email).toBe("neveractiveuser@github.local");
		});
	});

	describe("categorizeInactiveUsers", () => {
		it("should categorize users correctly", () => {
			const mockSeats: GitHubCopilotSeat[] = [
				{
					created_at: "2021-08-03T18:00:00-06:00",
					updated_at: "2021-09-23T15:00:00-06:00",
					pending_cancellation_date: null,
					last_activity_at: "2023-12-01T00:00:00Z", // Recent - active
					last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
					plan_type: "business",
					assignee: {
						login: "activeuser",
						id: 1,
						node_id: "MDQ6VXNlcjE=",
						avatar_url: "https://github.com/images/error/activeuser.gif",
						gravatar_id: "",
						url: "https://api.github.com/users/activeuser",
						html_url: "https://github.com/activeuser",
						followers_url: "https://api.github.com/users/activeuser/followers",
						following_url: "https://api.github.com/users/activeuser/following{/other_user}",
						gists_url: "https://api.github.com/users/activeuser/gists{/gist_id}",
						starred_url: "https://api.github.com/users/activeuser/starred{/owner}{/repo}",
						subscriptions_url: "https://api.github.com/users/activeuser/subscriptions",
						organizations_url: "https://api.github.com/users/activeuser/orgs",
						repos_url: "https://api.github.com/users/activeuser/repos",
						events_url: "https://api.github.com/users/activeuser/events{/privacy}",
						received_events_url: "https://api.github.com/users/activeuser/received_events",
						type: "User",
						site_admin: false,
						email: "activeuser@example.com",
					},
				},
				{
					created_at: "2021-08-03T18:00:00-06:00",
					updated_at: "2021-09-23T15:00:00-06:00",
					pending_cancellation_date: null,
					last_activity_at: "2023-10-01T00:00:00Z", // Notify period - should notify
					last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
					plan_type: "business",
					assignee: {
						login: "notifyuser",
						id: 2,
						node_id: "MDQ6VXNlcjI=",
						avatar_url: "https://github.com/images/error/notifyuser.gif",
						gravatar_id: "",
						url: "https://api.github.com/users/notifyuser",
						html_url: "https://github.com/notifyuser",
						followers_url: "https://api.github.com/users/notifyuser/followers",
						following_url: "https://api.github.com/users/notifyuser/following{/other_user}",
						gists_url: "https://api.github.com/users/notifyuser/gists{/gist_id}",
						starred_url: "https://api.github.com/users/notifyuser/starred{/owner}{/repo}",
						subscriptions_url: "https://api.github.com/users/notifyuser/subscriptions",
						organizations_url: "https://api.github.com/users/notifyuser/orgs",
						repos_url: "https://api.github.com/users/notifyuser/repos",
						events_url: "https://api.github.com/users/notifyuser/events{/privacy}",
						received_events_url: "https://api.github.com/users/notifyuser/received_events",
						type: "User",
						site_admin: false,
						email: "notifyuser@example.com",
					},
				},
				{
					created_at: "2021-08-03T18:00:00-06:00",
					updated_at: "2021-09-23T15:00:00-06:00",
					pending_cancellation_date: null,
					last_activity_at: "2023-08-01T00:00:00Z", // Remove period - should remove
					last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
					plan_type: "business",
					assignee: {
						login: "removeuser",
						id: 3,
						node_id: "MDQ6VXNlcjM=",
						avatar_url: "https://github.com/images/error/removeuser.gif",
						gravatar_id: "",
						url: "https://api.github.com/users/removeuser",
						html_url: "https://github.com/removeuser",
						followers_url: "https://api.github.com/users/removeuser/followers",
						following_url: "https://api.github.com/users/removeuser/following{/other_user}",
						gists_url: "https://api.github.com/users/removeuser/gists{/gist_id}",
						starred_url: "https://api.github.com/users/removeuser/starred{/owner}{/repo}",
						subscriptions_url: "https://api.github.com/users/removeuser/subscriptions",
						organizations_url: "https://api.github.com/users/removeuser/orgs",
						repos_url: "https://api.github.com/users/removeuser/repos",
						events_url: "https://api.github.com/users/removeuser/events{/privacy}",
						received_events_url: "https://api.github.com/users/removeuser/received_events",
						type: "User",
						site_admin: false,
						email: "removeuser@example.com",
					},
				},
			];

			const dateRanges = {
				notifyDateRange: {
					startDateEpochMs: new Date("2023-11-01T00:00:00Z").getTime(), // 60 days ago
					endDateEpochMs: new Date("2024-01-01T00:00:00Z").getTime(),
				},
				removeDateRange: {
					startDateEpochMs: new Date("2023-09-01T00:00:00Z").getTime(), // 90 days ago
					endDateEpochMs: new Date("2024-01-01T00:00:00Z").getTime(),
				},
			};

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const result = githubOperations.categorizeInactiveUsers(mockSeats, dateRanges);

			expect(result.usersToNotify).toHaveLength(1);
			expect(result.usersToNotify[0]).toEqual({
				email: "notifyuser@example.com",
				name: "notifyuser",
			});

			expect(result.usersToRemove).toHaveLength(1);
			expect(result.usersToRemove[0]).toEqual({
				email: "removeuser@example.com",
				name: "removeuser",
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				"GitHub Copilot: Found 1 users to notify and 1 users for removal.",
			);

			consoleSpy.mockRestore();
		});

		it("should remove users from notify list if they are in remove list", () => {
			const mockSeats: GitHubCopilotSeat[] = [
				{
					created_at: "2021-08-03T18:00:00-06:00",
					updated_at: "2021-09-23T15:00:00-06:00",
					pending_cancellation_date: null,
					last_activity_at: "2023-08-01T00:00:00Z", // Very old - should be in both lists
					last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
					plan_type: "business",
					assignee: {
						login: "veryinactiveuser",
						id: 1,
						node_id: "MDQ6VXNlcjE=",
						avatar_url: "https://github.com/images/error/veryinactiveuser.gif",
						gravatar_id: "",
						url: "https://api.github.com/users/veryinactiveuser",
						html_url: "https://github.com/veryinactiveuser",
						followers_url: "https://api.github.com/users/veryinactiveuser/followers",
						following_url: "https://api.github.com/users/veryinactiveuser/following{/other_user}",
						gists_url: "https://api.github.com/users/veryinactiveuser/gists{/gist_id}",
						starred_url: "https://api.github.com/users/veryinactiveuser/starred{/owner}{/repo}",
						subscriptions_url: "https://api.github.com/users/veryinactiveuser/subscriptions",
						organizations_url: "https://api.github.com/users/veryinactiveuser/orgs",
						repos_url: "https://api.github.com/users/veryinactiveuser/repos",
						events_url: "https://api.github.com/users/veryinactiveuser/events{/privacy}",
						received_events_url: "https://api.github.com/users/veryinactiveuser/received_events",
						type: "User",
						site_admin: false,
						email: "veryinactiveuser@example.com",
					},
				},
			];

			const dateRanges = {
				notifyDateRange: {
					startDateEpochMs: new Date("2023-11-01T00:00:00Z").getTime(),
					endDateEpochMs: new Date("2024-01-01T00:00:00Z").getTime(),
				},
				removeDateRange: {
					startDateEpochMs: new Date("2023-09-01T00:00:00Z").getTime(),
					endDateEpochMs: new Date("2024-01-01T00:00:00Z").getTime(),
				},
			};

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const result = githubOperations.categorizeInactiveUsers(mockSeats, dateRanges);

			// User should be in remove list but NOT in notify list
			expect(result.usersToNotify).toHaveLength(0);
			expect(result.usersToRemove).toHaveLength(1);
			expect(result.usersToRemove[0]).toEqual({
				email: "veryinactiveuser@example.com",
				name: "veryinactiveuser",
			});

			consoleSpy.mockRestore();
		});
	});

	describe("processInactiveUsers", () => {
		it("should process inactive users end-to-end", async () => {
			const mockSeats: GitHubCopilotSeat[] = [
				{
					created_at: "2021-08-03T18:00:00-06:00",
					updated_at: "2021-09-23T15:00:00-06:00",
					pending_cancellation_date: null,
					last_activity_at: "2023-10-01T00:00:00Z",
					last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
					plan_type: "business",
					assignee: {
						login: "testuser",
						id: 1,
						node_id: "MDQ6VXNlcjE=",
						avatar_url: "https://github.com/images/error/testuser.gif",
						gravatar_id: "",
						url: "https://api.github.com/users/testuser",
						html_url: "https://github.com/testuser",
						followers_url: "https://api.github.com/users/testuser/followers",
						following_url: "https://api.github.com/users/testuser/following{/other_user}",
						gists_url: "https://api.github.com/users/testuser/gists{/gist_id}",
						starred_url: "https://api.github.com/users/testuser/starred{/owner}{/repo}",
						subscriptions_url: "https://api.github.com/users/testuser/subscriptions",
						organizations_url: "https://api.github.com/users/testuser/orgs",
						repos_url: "https://api.github.com/users/testuser/repos",
						events_url: "https://api.github.com/users/testuser/events{/privacy}",
						received_events_url: "https://api.github.com/users/testuser/received_events",
						type: "User",
						site_admin: false,
						email: "testuser@example.com",
					},
				},
			];

			mockGitHubApi.fetchAllCopilotSeats.mockResolvedValueOnce(mockSeats);

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const result = await githubOperations.processInactiveUsers(60, 90);

			expect(result.seats).toEqual(mockSeats);
			expect(result.usersToNotify).toBeDefined();
			expect(result.usersToRemove).toBeDefined();
			expect(mockGitHubApi.fetchAllCopilotSeats).toHaveBeenCalledTimes(1);

			consoleSpy.mockRestore();
		});

		it("should handle empty seats gracefully", async () => {
			mockGitHubApi.fetchAllCopilotSeats.mockResolvedValueOnce([]);

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const result = await githubOperations.processInactiveUsers(60, 90);

			expect(result.seats).toEqual([]);
			expect(result.usersToNotify).toEqual([]);
			expect(result.usersToRemove).toEqual([]);

			consoleSpy.mockRestore();
		});
	});
});