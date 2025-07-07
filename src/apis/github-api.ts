import axios from "axios";

const GITHUB_API_BASE_URL = "https://api.github.com";

export interface GitHubCopilotSeatsResponse {
	total_seats: number;
	seats: GitHubCopilotSeat[];
}

export interface GitHubCopilotSeat {
	created_at: string;
	updated_at: string;
	pending_cancellation_date: string | null;
	last_activity_at: string | null;
	last_activity_editor: string | null;
	plan_type: "business" | "enterprise";
	assignee: GitHubUser;
	assigning_team?: GitHubTeam;
}

export interface GitHubUser {
	login: string;
	id: number;
	node_id: string;
	avatar_url: string;
	gravatar_id: string;
	url: string;
	html_url: string;
	followers_url: string;
	following_url: string;
	gists_url: string;
	starred_url: string;
	subscriptions_url: string;
	organizations_url: string;
	repos_url: string;
	events_url: string;
	received_events_url: string;
	type: "User";
	site_admin: boolean;
	email?: string;
}

export interface GitHubTeam {
	id: number;
	node_id: string;
	url: string;
	html_url: string;
	name: string;
	slug: string;
	description: string;
	privacy: "closed" | "secret";
	notification_setting: string;
	permission: string;
	members_url: string;
	repositories_url: string;
	parent: GitHubTeam | null;
}

export class GitHubApi {
	constructor(
		private token: string,
		private organization: string,
	) {}

	/**
	 * Fetch all Copilot seat assignments for the organization
	 * @param page Page number for pagination (default: 1)
	 * @param perPage Number of results per page (default: 100, max: 100)
	 */
	async fetchCopilotSeats(
		page = 1,
		perPage = 100,
	): Promise<GitHubCopilotSeatsResponse> {
		try {
			const response = await axios.get<GitHubCopilotSeatsResponse>(
				`${GITHUB_API_BASE_URL}/orgs/${this.organization}/copilot/billing/seats`,
				{
					headers: {
						Accept: "application/vnd.github+json",
						Authorization: `Bearer ${this.token}`,
						"X-GitHub-Api-Version": "2022-11-28",
					},
					params: {
						page,
						per_page: Math.min(perPage, 100), // GitHub API max is 100
					},
				},
			);
			return response.data;
		} catch (error) {
			console.error("Error fetching GitHub Copilot seats:", error);
			if (axios.isAxiosError(error)) {
				console.error("API error details:", error.response?.data);
				if (error.response?.status === 404) {
					throw new Error(
						`Organization '${this.organization}' not found or no Copilot subscription`,
					);
				}
				if (error.response?.status === 403) {
					throw new Error(
						"Insufficient permissions to access Copilot billing information",
					);
				}
			}
			throw error;
		}
	}

	/**
	 * Fetch all Copilot seat assignments with automatic pagination
	 */
	async fetchAllCopilotSeats(): Promise<GitHubCopilotSeat[]> {
		const allSeats: GitHubCopilotSeat[] = [];
		let page = 1;
		let hasMorePages = true;

		while (hasMorePages) {
			try {
				const response = await this.fetchCopilotSeats(page, 100);
				allSeats.push(...response.seats);

				// Check if we have more pages
				hasMorePages = response.seats.length === 100;
				page++;

				console.log(
					`Fetched ${response.seats.length} seats from page ${page - 1}. Total so far: ${allSeats.length}`,
				);
			} catch (error) {
				console.error(`Error fetching page ${page}:`, error);
				throw error;
			}
		}

		console.log(`Fetched total of ${allSeats.length} Copilot seats.`);
		return allSeats;
	}

	/**
	 * Get Copilot seat assignment details for a specific user
	 * @param username GitHub username
	 */
	async fetchUserCopilotSeat(username: string): Promise<GitHubCopilotSeat> {
		try {
			const response = await axios.get<GitHubCopilotSeat>(
				`${GITHUB_API_BASE_URL}/orgs/${this.organization}/members/${username}/copilot`,
				{
					headers: {
						Accept: "application/vnd.github+json",
						Authorization: `Bearer ${this.token}`,
						"X-GitHub-Api-Version": "2022-11-28",
					},
				},
			);
			return response.data;
		} catch (error) {
			console.error(`Error fetching Copilot seat for user ${username}:`, error);
			if (axios.isAxiosError(error)) {
				console.error("API error details:", error.response?.data);
				if (error.response?.status === 404) {
					throw new Error(
						`User '${username}' not found or does not have a Copilot seat`,
					);
				}
			}
			throw error;
		}
	}
}