import { App } from "@slack/bolt";
import { SlackApi } from "../../src/apis/slack-api";
import type { User } from "../../src/types/users";

// Mock the Slack Bolt App
jest.mock("@slack/bolt");
const MockedApp = App as jest.MockedClass<typeof App>;

describe("SlackApi", () => {
	let slackApi: SlackApi;
	let mockPostMessage: jest.Mock;
	let mockLookupByEmail: jest.Mock;
	let mockClient: any;
	const mockBotToken = "xoxb-test-token";
	const mockSigningSecret = "test-signing-secret";

	beforeEach(() => {
		jest.clearAllMocks();
		mockPostMessage = jest.fn();
		mockLookupByEmail = jest.fn();
		mockClient = {
			chat: {
				postMessage: mockPostMessage,
			},
			users: {
				lookupByEmail: mockLookupByEmail,
			},
		};

		// Mock the App constructor and client
		MockedApp.mockImplementation(
			() =>
				({
					client: mockClient,
				}) as any,
		);

		slackApi = new SlackApi(mockBotToken, mockSigningSecret, true);
	});

	describe("sendInactiveUsersNotification", () => {
		const mockRecipientUserId = "U12345678";

		it("should send notification for inactive users with Slack usernames", async () => {
			const inactiveUsers: User[] = [
				{ name: "John Doe", email: "john@example.com" },
				{ name: "Jane Smith", email: "jane@example.com" },
			];

			// Mock successful user lookups
			mockLookupByEmail
				.mockResolvedValueOnce({
					user: {
						id: "U11111111",
						real_name: "John Doe",
						profile: { email: "john@example.com" },
					},
				})
				.mockResolvedValueOnce({
					user: {
						id: "U22222222",
						real_name: "Jane Smith",
						profile: { email: "jane@example.com" },
					},
				});

			mockPostMessage.mockResolvedValueOnce({
				ok: true,
				message: { text: "test message" },
			});

			await slackApi.sendChannelNotification(mockRecipientUserId, inactiveUsers, [], "Test App");

			const todayMinus60Days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

			expect(mockLookupByEmail).toHaveBeenCalledTimes(2);
			expect(mockLookupByEmail).toHaveBeenNthCalledWith(1, {
				email: "john@example.com",
			});
			expect(mockLookupByEmail).toHaveBeenNthCalledWith(2, {
				email: "jane@example.com",
			});

			expect(mockPostMessage).toHaveBeenCalledWith({
				channel: mockRecipientUserId,
				text: `Inactive Test App users (no activity since ${todayMinus60Days.toLocaleDateString("fi")}):
- John Doe (john@example.com, <@U11111111>)
- Jane Smith (jane@example.com, <@U22222222>)`,
			});
		});

		it("should handle users not found in Slack", async () => {
			const inactiveUsers: User[] = [
				{ name: "John Doe", email: "john@example.com" },
				{ name: "Jane Smith", email: "jane@example.com" },
			];

			// Mock one successful lookup and one failure
			mockLookupByEmail
				.mockResolvedValueOnce({
					user: {
						id: "U11111111",
						real_name: "John Doe",
						profile: { email: "john@example.com" },
					},
				})
				.mockRejectedValueOnce(new Error("User not found"));

			mockPostMessage.mockResolvedValueOnce({
				ok: true,
				message: { text: "test message" },
			});

			const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

			await slackApi.sendChannelNotification(mockRecipientUserId, inactiveUsers, [], "Test App");

			const todayMinus60Days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

			expect(mockPostMessage).toHaveBeenCalledWith({
				channel: mockRecipientUserId,
				text: `Inactive Test App users (no activity since ${todayMinus60Days.toLocaleDateString("fi")}):
- John Doe (john@example.com, <@U11111111>)
- Jane Smith (jane@example.com)`,
			});

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				"Could not find Slack user for email jane@example.com:",
				JSON.stringify(new Error("User not found"), null, 2),
			);

			consoleWarnSpy.mockRestore();
		});

		it("should not send message when no inactive users", async () => {
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			await slackApi.sendChannelNotification(mockRecipientUserId, [], [], "Test App");

			expect(mockPostMessage).not.toHaveBeenCalled();
			expect(mockLookupByEmail).not.toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith("No inactive users to report.");

			consoleSpy.mockRestore();
		});

		it("should handle Slack API errors when sending message", async () => {
			const inactiveUsers: User[] = [{ name: "John Doe", email: "john@example.com" }];

			mockLookupByEmail.mockResolvedValueOnce({
				user: {
					id: "U11111111",
					real_name: "John Doe",
					profile: { email: "john@example.com" },
				},
			});

			const mockError = new Error("Slack API Error");
			mockPostMessage.mockRejectedValueOnce(mockError);

			await expect(
				slackApi.sendChannelNotification(mockRecipientUserId, inactiveUsers, [], "Test App"),
			).rejects.toThrow("Slack API Error");
		});

		it("should not send notification when disabled", async () => {
			const disabledSlackApi = new SlackApi(mockBotToken, mockSigningSecret, false);
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const inactiveUsers: User[] = [{ name: "John Doe", email: "john@example.com" }];

			await disabledSlackApi.sendChannelNotification(mockRecipientUserId, [], inactiveUsers, "Test App");

			expect(mockPostMessage).not.toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith("Slack notifications are disabled.");

			consoleSpy.mockRestore();
		});
	});

	describe("sendInactivityWarningDM", () => {
		it("should send DM successfully to user", async () => {
			const userEmail = "john@example.com";
			const inactiveDays = 60;
			const appName = "Test App";

			mockLookupByEmail.mockResolvedValueOnce({
				user: {
					id: "U11111111",
					real_name: "John Doe",
					profile: { email: userEmail },
				},
			});

			mockPostMessage.mockResolvedValueOnce({
				ok: true,
				message: { text: "test message" },
			});

			const result = await slackApi.sendInactivityWarningDM(userEmail, inactiveDays, appName);

			expect(result).toBe(true);
			expect(mockLookupByEmail).toHaveBeenCalledWith({ email: userEmail });
			expect(mockPostMessage).toHaveBeenCalledWith({
				channel: "U11111111",
				text: "You haven't used Test App for 60 days. If you are planning to not use the app, please inform IT so we can remove the license.",
			});
		});

		it("should return false when user not found in Slack", async () => {
			const userEmail = "notfound@example.com";
			const inactiveDays = 60;
			const appName = "Test App";

			mockLookupByEmail.mockRejectedValueOnce(new Error("User not found"));

			const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

			const result = await slackApi.sendInactivityWarningDM(userEmail, inactiveDays, appName);

			expect(result).toBe(false);
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				`Failed to send inactivity warning DM to ${userEmail}:`,
				JSON.stringify(new Error("User not found"), null, 2),
			);

			consoleWarnSpy.mockRestore();
		});

		it("should return false when user has no Slack ID", async () => {
			const userEmail = "noid@example.com";
			const inactiveDays = 60;
			const appName = "Test App";

			mockLookupByEmail.mockResolvedValueOnce({
				user: {
					id: null,
					real_name: "No ID User",
					profile: { email: userEmail },
				},
			});

			const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

			const result = await slackApi.sendInactivityWarningDM(userEmail, inactiveDays, appName);

			expect(result).toBe(false);
			expect(consoleWarnSpy).toHaveBeenCalledWith(`Could not find Slack user ID for email: ${userEmail}`);

			consoleWarnSpy.mockRestore();
		});

		it("should return false when message sending fails", async () => {
			const userEmail = "john@example.com";
			const inactiveDays = 60;
			const appName = "Test App";

			mockLookupByEmail.mockResolvedValueOnce({
				user: {
					id: "U11111111",
					real_name: "John Doe",
					profile: { email: userEmail },
				},
			});

			mockPostMessage.mockRejectedValueOnce(new Error("Message sending failed"));

			const result = await slackApi.sendInactivityWarningDM(userEmail, inactiveDays, appName);

			expect(result).toBe(false);
		});

		it("should return false when disabled", async () => {
			const disabledSlackApi = new SlackApi(mockBotToken, mockSigningSecret, false);
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const result = await disabledSlackApi.sendInactivityWarningDM("test@example.com", 60, "Test App");

			expect(result).toBe(false);
			expect(consoleSpy).toHaveBeenCalledWith("Slack notifications are disabled.");

			consoleSpy.mockRestore();
		});
	});

	describe("sendRemovalCandidatesNotification", () => {
		const mockRecipientUserId = "U12345678";

		it("should send removal candidates notification", async () => {
			const usersToRemove: User[] = [
				{ name: "John Doe", email: "john@example.com" },
				{ name: "Jane Smith", email: "jane@example.com" },
			];
			const inactiveDays = 90;
			const appName = "Test App";

			mockLookupByEmail
				.mockResolvedValueOnce({
					user: {
						id: "U11111111",
						real_name: "John Doe",
						profile: { email: "john@example.com" },
					},
				})
				.mockResolvedValueOnce({
					user: {
						id: "U22222222",
						real_name: "Jane Smith",
						profile: { email: "jane@example.com" },
					},
				});

			mockPostMessage.mockResolvedValueOnce({
				ok: true,
				message: { text: "test message" },
			});

			await slackApi.sendChannelNotification(mockRecipientUserId, [], usersToRemove, appName);

			expect(mockPostMessage).toHaveBeenCalledWith({
				channel: mockRecipientUserId,
				text: `Test App license removal candidates (no activity for ${inactiveDays}+ days):
- John Doe (john@example.com, <@U11111111>)
- Jane Smith (jane@example.com, <@U22222222>)`,
			});
		});

		it("should handle users not found in Slack for removal notification", async () => {
			const usersToRemove: User[] = [
				{ name: "John Doe", email: "john@example.com" },
				{ name: "Jane Smith", email: "jane@example.com" },
			];
			const inactiveDays = 90;
			const appName = "Test App";

			mockLookupByEmail
				.mockResolvedValueOnce({
					user: {
						id: "U11111111",
						real_name: "John Doe",
						profile: { email: "john@example.com" },
					},
				})
				.mockRejectedValueOnce(new Error("User not found"));

			mockPostMessage.mockResolvedValueOnce({
				ok: true,
				message: { text: "test message" },
			});

			const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

			await slackApi.sendChannelNotification(mockRecipientUserId, [], usersToRemove, appName);

			expect(mockPostMessage).toHaveBeenCalledWith({
				channel: mockRecipientUserId,
				text: `Test App license removal candidates (no activity for ${inactiveDays}+ days):
- John Doe (john@example.com, <@U11111111>)
- Jane Smith (jane@example.com)`,
			});

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				"Could not find Slack user for email jane@example.com:",
				JSON.stringify(new Error("User not found"), null, 2),
			);

			consoleWarnSpy.mockRestore();
		});

		it("should not send message when no users to remove", async () => {
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			await slackApi.sendChannelNotification(mockRecipientUserId, [], [], "Test App", "removal");

			expect(mockPostMessage).not.toHaveBeenCalled();
			expect(mockLookupByEmail).not.toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith("No users for removal to report.");

			consoleSpy.mockRestore();
		});

		it("should handle Slack API errors when sending removal notification", async () => {
			const usersToRemove: User[] = [{ name: "John Doe", email: "john@example.com" }];
			const appName = "Test App";

			mockLookupByEmail.mockResolvedValueOnce({
				user: {
					id: "U11111111",
					real_name: "John Doe",
					profile: { email: "john@example.com" },
				},
			});

			const mockError = new Error("Slack API Error");
			mockPostMessage.mockRejectedValueOnce(mockError);

			await expect(slackApi.sendChannelNotification(mockRecipientUserId, [], usersToRemove, appName)).rejects.toThrow(
				"Slack API Error",
			);
		});

		it("should not send notification when disabled", async () => {
			const disabledSlackApi = new SlackApi(mockBotToken, mockSigningSecret, false);
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const usersToRemove: User[] = [{ name: "John Doe", email: "john@example.com" }];

			await disabledSlackApi.sendChannelNotification(mockRecipientUserId, [], usersToRemove, "Test App");

			expect(mockPostMessage).not.toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith("Slack notifications are disabled.");

			consoleSpy.mockRestore();
		});
	});

	describe("constructor", () => {
		it("should initialize App with bot token and signing secret when enabled", () => {
			new SlackApi(mockBotToken, mockSigningSecret, true);
			expect(MockedApp).toHaveBeenCalledWith({
				token: mockBotToken,
				signingSecret: mockSigningSecret,
			});
		});

		it("should not initialize App when disabled", () => {
			jest.clearAllMocks();
			new SlackApi(mockBotToken, mockSigningSecret, false);
			expect(MockedApp).not.toHaveBeenCalled();
		});
	});
});
