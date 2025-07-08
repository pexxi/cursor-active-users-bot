import { CursorAdminApi } from "../../src/apis/cursor-admin-api";
import { SlackApi } from "../../src/apis/slack-api";
import { CursorOperations } from "../../src/services/cursor-operations";
import type { EnvData } from "../../src/utils/env";
import type { SecretsData } from "../../src/utils/secrets";

// Mock the dependencies
jest.mock("../../src/apis/cursor-admin-api");
jest.mock("../../src/apis/slack-api");

const mockCursorAdminApi = CursorAdminApi as jest.MockedClass<typeof CursorAdminApi>;
const mockSlackApi = SlackApi as jest.MockedClass<typeof SlackApi>;

describe("CursorOperations", () => {
	let cursorOperations: CursorOperations;

	const mockSecrets: SecretsData = {
		CURSOR_API_KEY: "test-cursor-api-key",
		GITHUB_TOKEN: "test-github-token",
		GITHUB_ORG: "test-org",
		SLACK_BOT_TOKEN: "test-slack-bot-token",
		SLACK_USER_ID: "test-slack-user-id",
		SLACK_SIGNING_SECRET: "test-slack-signing-secret",
	};

	const mockEnv: EnvData = {
		NOTIFY_AFTER_DAYS: 60,
		REMOVE_AFTER_DAYS: 90,
		ENABLE_SLACK_NOTIFICATIONS: true,
		ENABLE_CURSOR: true,
		ENABLE_GITHUB_COPILOT: true,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		const mockSlackApiInstance = {
			sendInactivityWarningDM: jest.fn().mockResolvedValue(true),
			sendChannelNotification: jest.fn().mockResolvedValue(true),
		} as unknown as jest.Mocked<SlackApi>;

		mockSlackApi.mockImplementation(() => mockSlackApiInstance);
		cursorOperations = new CursorOperations(mockSecrets, mockEnv, mockSlackApiInstance);
	});

	describe("constructor", () => {
		it("should initialize with secrets and env", () => {
			expect(mockCursorAdminApi).toHaveBeenCalledWith(mockSecrets.CURSOR_API_KEY);
			// SlackApi is now passed as a parameter, so we don't expect it to be constructed
			expect(cursorOperations).toBeDefined();
		});
	});

	describe("findInactiveUsers", () => {
		it("should return users not found in active usage data", () => {
			const members = [
				{ name: "John Doe", email: "john@example.com" },
				{ name: "Jane Smith", email: "jane@example.com" },
				{ name: "Bob Wilson", email: "bob@example.com" },
			];

			const usageData = [
				{ email: "john@example.com", isActive: true, date: Date.now() },
				{ email: "jane@example.com", isActive: false, date: Date.now() },
			];

			const result = cursorOperations.findInactiveUsers(members, usageData as any);

			expect(result).toEqual([
				{ name: "Jane Smith", email: "jane@example.com" },
				{ name: "Bob Wilson", email: "bob@example.com" },
			]);
		});

		it("should handle empty usage data", () => {
			const members = [{ name: "John Doe", email: "john@example.com" }];

			const result = cursorOperations.findInactiveUsers(members, []);

			expect(result).toEqual([{ name: "John Doe", email: "john@example.com" }]);
		});
	});

	describe("categorizeInactiveUsers", () => {
		it("should categorize users correctly", () => {
			const members = [
				{ name: "John Doe", email: "john@example.com" },
				{ name: "Jane Smith", email: "jane@example.com" },
				{ name: "Bob Wilson", email: "bob@example.com" },
			];

			const notifyPeriodUsage = [{ email: "john@example.com", isActive: true, date: Date.now() }];

			const removePeriodUsage = [
				{ email: "john@example.com", isActive: true, date: Date.now() },
				{ email: "jane@example.com", isActive: true, date: Date.now() },
			];

			const result = cursorOperations.categorizeInactiveUsers(
				members,
				notifyPeriodUsage as any,
				removePeriodUsage as any,
			);

			expect(result.usersToNotify).toEqual([{ name: "Jane Smith", email: "jane@example.com" }]);
			expect(result.usersToRemove).toEqual([{ name: "Bob Wilson", email: "bob@example.com" }]);
		});
	});

	describe("processInactiveUsers", () => {
		it("should process inactive users successfully", async () => {
			const mockMembers = [
				{
					name: "John Doe",
					email: "john@example.com",
					role: "member" as const,
				},
			];

			const mockUsageData = {
				data: [{ email: "john@example.com", isActive: true, date: Date.now() }],
			};

			const mockFetchTeamMembers = jest.fn().mockResolvedValue(mockMembers);
			const mockFetchDailyUsageData = jest.fn().mockResolvedValue(mockUsageData);
			const mockSendInactivityWarningDM = jest.fn().mockResolvedValue(true);
			const mockSendRemovalCandidatesNotification = jest.fn().mockResolvedValue(undefined);

			// Create a new instance with the mocked APIs
			const mockCursorApiInstance = {
				fetchTeamMembers: mockFetchTeamMembers,
				fetchDailyUsageData: mockFetchDailyUsageData,
			};
			const mockSlackApiInstance = {
				sendInactivityWarningDM: mockSendInactivityWarningDM,
				sendRemovalCandidatesNotification: mockSendRemovalCandidatesNotification,
			};

			// Replace the instances in the cursorOperations object
			(cursorOperations as any).cursorApi = mockCursorApiInstance;
			(cursorOperations as any).slackApi = mockSlackApiInstance;

			const result = await cursorOperations.processInactiveUsers();

			expect(mockFetchTeamMembers).toHaveBeenCalled();
			expect(mockFetchDailyUsageData).toHaveBeenCalledTimes(2);
			expect(result.members).toEqual(mockMembers);
		});

		it("should handle empty members list", async () => {
			const mockFetchTeamMembers = jest.fn().mockResolvedValue([]);

			// Replace the instance in the cursorOperations object
			(cursorOperations as any).cursorApi = {
				fetchTeamMembers: mockFetchTeamMembers,
			};

			const result = await cursorOperations.processInactiveUsers();

			expect(result).toEqual({
				members: [],
				usersToNotify: [],
				usersToRemove: [],
			});
		});
	});
});
