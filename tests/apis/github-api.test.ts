import axios from "axios";
import {
	GitHubApi,
	type GitHubCopilotSeatsResponse,
	type GitHubCopilotSeat,
	type GitHubUser,
} from "../../src/apis/github-api";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("GitHubApi", () => {
	let api: GitHubApi;
	const mockToken = "test-github-token";
	const mockOrg = "test-org";

	beforeEach(() => {
		api = new GitHubApi(mockToken, mockOrg);
		jest.clearAllMocks();
	});

	describe("fetchCopilotSeats", () => {
		it("should fetch Copilot seats successfully", async () => {
			const mockUser: GitHubUser = {
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
			};

			const mockSeat: GitHubCopilotSeat = {
				created_at: "2021-08-03T18:00:00-06:00",
				updated_at: "2021-09-23T15:00:00-06:00",
				pending_cancellation_date: null,
				last_activity_at: "2021-10-14T00:53:32-06:00",
				last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
				plan_type: "business",
				assignee: mockUser,
			};

			const mockResponse: GitHubCopilotSeatsResponse = {
				total_seats: 1,
				seats: [mockSeat],
			};

			mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

			const result = await api.fetchCopilotSeats();

			expect(result).toEqual(mockResponse);
			expect(mockedAxios.get).toHaveBeenCalledWith(
				`https://api.github.com/orgs/${mockOrg}/copilot/billing/seats`,
				{
					headers: {
						Accept: "application/vnd.github+json",
						Authorization: `Bearer ${mockToken}`,
						"X-GitHub-Api-Version": "2022-11-28",
					},
					params: {
						page: 1,
						per_page: 100,
					},
				},
			);
		});

		it("should handle pagination parameters correctly", async () => {
			const mockResponse: GitHubCopilotSeatsResponse = {
				total_seats: 0,
				seats: [],
			};

			mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

			await api.fetchCopilotSeats(2, 50);

			expect(mockedAxios.get).toHaveBeenCalledWith(
				`https://api.github.com/orgs/${mockOrg}/copilot/billing/seats`,
				{
					headers: {
						Accept: "application/vnd.github+json",
						Authorization: `Bearer ${mockToken}`,
						"X-GitHub-Api-Version": "2022-11-28",
					},
					params: {
						page: 2,
						per_page: 50,
					},
				},
			);
		});

		it("should limit per_page to maximum of 100", async () => {
			const mockResponse: GitHubCopilotSeatsResponse = {
				total_seats: 0,
				seats: [],
			};

			mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

			await api.fetchCopilotSeats(1, 150);

			expect(mockedAxios.get).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					params: expect.objectContaining({
						per_page: 100,
					}),
				}),
			);
		});

		it("should handle 404 errors with specific message", async () => {
			const mockError = {
				isAxiosError: true,
				response: {
					status: 404,
					data: { message: "Not Found" },
				},
			};
			mockedAxios.get.mockRejectedValueOnce(mockError);
			mockedAxios.isAxiosError.mockReturnValueOnce(true);

			await expect(api.fetchCopilotSeats()).rejects.toThrow(
				`Organization '${mockOrg}' not found or no Copilot subscription`,
			);
		});

		it("should handle 403 errors with specific message", async () => {
			const mockError = {
				isAxiosError: true,
				response: {
					status: 403,
					data: { message: "Forbidden" },
				},
			};
			mockedAxios.get.mockRejectedValueOnce(mockError);
			mockedAxios.isAxiosError.mockReturnValueOnce(true);

			await expect(api.fetchCopilotSeats()).rejects.toThrow(
				"Insufficient permissions to access Copilot billing information",
			);
		});

		it("should handle general API errors", async () => {
			const mockError = new Error("Network Error");
			mockedAxios.get.mockRejectedValueOnce(mockError);

			await expect(api.fetchCopilotSeats()).rejects.toThrow("Network Error");
		});
	});

	describe("fetchAllCopilotSeats", () => {
		it("should fetch all seats with automatic pagination", async () => {
			const mockSeats1 = Array.from({ length: 100 }, (_, i) => ({
				created_at: "2021-08-03T18:00:00-06:00",
				updated_at: "2021-09-23T15:00:00-06:00",
				pending_cancellation_date: null,
				last_activity_at: "2021-10-14T00:53:32-06:00",
				last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
				plan_type: "business" as const,
				assignee: {
					login: `user${i}`,
					id: i,
					node_id: `MDQ6VXNlcjE${i}=`,
					avatar_url: `https://github.com/images/error/user${i}.gif`,
					gravatar_id: "",
					url: `https://api.github.com/users/user${i}`,
					html_url: `https://github.com/user${i}`,
					followers_url: `https://api.github.com/users/user${i}/followers`,
					following_url: `https://api.github.com/users/user${i}/following{/other_user}`,
					gists_url: `https://api.github.com/users/user${i}/gists{/gist_id}`,
					starred_url: `https://api.github.com/users/user${i}/starred{/owner}{/repo}`,
					subscriptions_url: `https://api.github.com/users/user${i}/subscriptions`,
					organizations_url: `https://api.github.com/users/user${i}/orgs`,
					repos_url: `https://api.github.com/users/user${i}/repos`,
					events_url: `https://api.github.com/users/user${i}/events{/privacy}`,
					received_events_url: `https://api.github.com/users/user${i}/received_events`,
					type: "User" as const,
					site_admin: false,
					email: `user${i}@example.com`,
				},
			}));

			const mockSeats2 = Array.from({ length: 50 }, (_, i) => ({
				created_at: "2021-08-03T18:00:00-06:00",
				updated_at: "2021-09-23T15:00:00-06:00",
				pending_cancellation_date: null,
				last_activity_at: "2021-10-14T00:53:32-06:00",
				last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
				plan_type: "business" as const,
				assignee: {
					login: `user${i + 100}`,
					id: i + 100,
					node_id: `MDQ6VXNlcjE${i + 100}=`,
					avatar_url: `https://github.com/images/error/user${i + 100}.gif`,
					gravatar_id: "",
					url: `https://api.github.com/users/user${i + 100}`,
					html_url: `https://github.com/user${i + 100}`,
					followers_url: `https://api.github.com/users/user${i + 100}/followers`,
					following_url: `https://api.github.com/users/user${i + 100}/following{/other_user}`,
					gists_url: `https://api.github.com/users/user${i + 100}/gists{/gist_id}`,
					starred_url: `https://api.github.com/users/user${i + 100}/starred{/owner}{/repo}`,
					subscriptions_url: `https://api.github.com/users/user${i + 100}/subscriptions`,
					organizations_url: `https://api.github.com/users/user${i + 100}/orgs`,
					repos_url: `https://api.github.com/users/user${i + 100}/repos`,
					events_url: `https://api.github.com/users/user${i + 100}/events{/privacy}`,
					received_events_url: `https://api.github.com/users/user${i + 100}/received_events`,
					type: "User" as const,
					site_admin: false,
					email: `user${i + 100}@example.com`,
				},
			}));

			mockedAxios.get
				.mockResolvedValueOnce({
					data: { total_seats: 150, seats: mockSeats1 },
				})
				.mockResolvedValueOnce({
					data: { total_seats: 150, seats: mockSeats2 },
				});

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const result = await api.fetchAllCopilotSeats();

			expect(result).toHaveLength(150);
			expect(result).toEqual([...mockSeats1, ...mockSeats2]);
			expect(mockedAxios.get).toHaveBeenCalledTimes(2);

			consoleSpy.mockRestore();
		});

		it("should handle single page response", async () => {
			const mockSeats = Array.from({ length: 50 }, (_, i) => ({
				created_at: "2021-08-03T18:00:00-06:00",
				updated_at: "2021-09-23T15:00:00-06:00",
				pending_cancellation_date: null,
				last_activity_at: "2021-10-14T00:53:32-06:00",
				last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
				plan_type: "business" as const,
				assignee: {
					login: `user${i}`,
					id: i,
					node_id: `MDQ6VXNlcjE${i}=`,
					avatar_url: `https://github.com/images/error/user${i}.gif`,
					gravatar_id: "",
					url: `https://api.github.com/users/user${i}`,
					html_url: `https://github.com/user${i}`,
					followers_url: `https://api.github.com/users/user${i}/followers`,
					following_url: `https://api.github.com/users/user${i}/following{/other_user}`,
					gists_url: `https://api.github.com/users/user${i}/gists{/gist_id}`,
					starred_url: `https://api.github.com/users/user${i}/starred{/owner}{/repo}`,
					subscriptions_url: `https://api.github.com/users/user${i}/subscriptions`,
					organizations_url: `https://api.github.com/users/user${i}/orgs`,
					repos_url: `https://api.github.com/users/user${i}/repos`,
					events_url: `https://api.github.com/users/user${i}/events{/privacy}`,
					received_events_url: `https://api.github.com/users/user${i}/received_events`,
					type: "User" as const,
					site_admin: false,
					email: `user${i}@example.com`,
				},
			}));

			mockedAxios.get.mockResolvedValueOnce({
				data: { total_seats: 50, seats: mockSeats },
			});

			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			const result = await api.fetchAllCopilotSeats();

			expect(result).toHaveLength(50);
			expect(result).toEqual(mockSeats);
			expect(mockedAxios.get).toHaveBeenCalledTimes(1);

			consoleSpy.mockRestore();
		});
	});

	describe("fetchUserCopilotSeat", () => {
		it("should fetch user Copilot seat successfully", async () => {
			const mockUser: GitHubUser = {
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
			};

			const mockSeat: GitHubCopilotSeat = {
				created_at: "2021-08-03T18:00:00-06:00",
				updated_at: "2021-09-23T15:00:00-06:00",
				pending_cancellation_date: null,
				last_activity_at: "2021-10-14T00:53:32-06:00",
				last_activity_editor: "vscode/1.77.3/copilot/1.86.82",
				plan_type: "business",
				assignee: mockUser,
			};

			mockedAxios.get.mockResolvedValueOnce({ data: mockSeat });

			const result = await api.fetchUserCopilotSeat("testuser");

			expect(result).toEqual(mockSeat);
			expect(mockedAxios.get).toHaveBeenCalledWith(
				`https://api.github.com/orgs/${mockOrg}/members/testuser/copilot`,
				{
					headers: {
						Accept: "application/vnd.github+json",
						Authorization: `Bearer ${mockToken}`,
						"X-GitHub-Api-Version": "2022-11-28",
					},
				},
			);
		});

		it("should handle 404 errors for non-existent users", async () => {
			const mockError = {
				isAxiosError: true,
				response: {
					status: 404,
					data: { message: "Not Found" },
				},
			};
			mockedAxios.get.mockRejectedValueOnce(mockError);
			mockedAxios.isAxiosError.mockReturnValueOnce(true);

			await expect(api.fetchUserCopilotSeat("nonexistent")).rejects.toThrow(
				"User 'nonexistent' not found or does not have a Copilot seat",
			);
		});
	});
});