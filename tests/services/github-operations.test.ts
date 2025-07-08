import { GitHubApi, type GitHubCopilotSeat } from "../../src/apis/github-api";
import { SlackApi } from "../../src/apis/slack-api";
import { GitHubOperations } from "../../src/services/github-operations";
import type { EnvData } from "../../src/utils/env";
import type { SecretsData } from "../../src/utils/secrets";

// Mock the dependencies
jest.mock("../../src/apis/github-api");
jest.mock("../../src/apis/slack-api");

const MockedGitHubApi = GitHubApi as jest.MockedClass<typeof GitHubApi>;
const MockedSlackApi = SlackApi as jest.MockedClass<typeof SlackApi>;

describe("GitHubOperations", () => {
	let githubOperations: GitHubOperations;
	let mockGitHubApi: jest.Mocked<GitHubApi>;
	let mockSlackApi: jest.Mocked<SlackApi>;

	const mockSecrets: SecretsData = {
		CURSOR_API_KEY: "test-cursor-api-key",
		GITHUB_TOKEN: "test-github-token",
		GITHUB_ORG: "test-org",
		SLACK_BOT_TOKEN: "test-slack-bot-token",
		SLACK_USER_ID: "test-slack-user-id",
		SLACK_SIGNING_SECRET: "test-slack-signing-secret",
		NOTIFY_AFTER_DAYS: 60,
		REMOVE_AFTER_DAYS: 90,
		ENABLE_NOTIFICATIONS: true,
	};

	const mockEnv: EnvData = {
		NOTIFY_AFTER_DAYS: 60,
		REMOVE_AFTER_DAYS: 90,
		ENABLE_NOTIFICATIONS: true,
		ENABLE_CURSOR: true,
		ENABLE_GITHUB_COPILOT: true,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockGitHubApi = {
			fetchAllCopilotSeats: jest.fn(),
			fetchCopilotSeats: jest.fn(),
			fetchUserCopilotSeat: jest.fn(),
		} as unknown as jest.Mocked<GitHubApi>;
		mockSlackApi = {
			sendInactivityWarningDM: jest.fn(),
			sendRemovalCandidatesNotification: jest.fn(),
			sendInactiveUsersNotification: jest.fn(),
		} as unknown as jest.Mocked<SlackApi>;

		MockedGitHubApi.mockImplementation(() => mockGitHubApi);
		MockedSlackApi.mockImplementation(() => mockSlackApi);
		githubOperations = new GitHubOperations(mockSecrets, mockEnv);
	});

	describe("constructor", () => {
		it("should initialize with secrets and env", () => {
			expect(MockedGitHubApi).toHaveBeenCalledWith(mockSecrets.GITHUB_TOKEN, mockSecrets.GITHUB_ORG);
			expect(MockedSlackApi).toHaveBeenCalledWith(
				mockSecrets.SLACK_BOT_TOKEN,
				mockSecrets.SLACK_SIGNING_SECRET,
				mockEnv.ENABLE_NOTIFICATIONS,
			);
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
			const userWithoutEmail = result.find((user) => user.name === "neveractiveuser");
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

			const result = githubOperations.categorizeInactiveUsers(
				mockSeats,
				dateRanges.notifyDateRange,
				dateRanges.removeDateRange,
			);

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

			expect(consoleSpy).toHaveBeenCalledWith("GitHub Copilot: Found 1 users to notify and 1 users for removal.");

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

			const result = githubOperations.categorizeInactiveUsers(
				mockSeats,
				dateRanges.notifyDateRange,
				dateRanges.removeDateRange,
			);

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

			const result = await githubOperations.processInactiveUsers();

			expect(result.seats).toEqual(mockSeats);
			expect(result.usersToNotify).toBeDefined();
			expect(result.usersToRemove).toBeDefined();
			expect(mockGitHubApi.fetchAllCopilotSeats).toHaveBeenCalledTimes(1);

			consoleSpy.mockRestore();
		});

		it("should handle empty seats gracefully", async () => {
			mockGitHubApi.fetchAllCopilotSeats.mockResolvedValueOnce([]);

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const result = await githubOperations.processInactiveUsers();

			expect(result.seats).toEqual([]);
			expect(result.usersToNotify).toEqual([]);
			expect(result.usersToRemove).toEqual([]);

			consoleSpy.mockRestore();
		});
	});
});
