import axios from "axios";

const CURSOR_API_BASE_URL = "https://api.cursor.com";

export interface CursorTeamMembersResponse {
	teamMembers: CursorUser[];
}

export interface CursorUser {
	name: string;
	email: string;
	role: "owner" | "member" | "free-owner";
}

export interface DailyUsageData {
	date: number; // epoch milliseconds
	isActive: boolean;
	totalLinesAdded: number;
	totalLinesDeleted: number;
	acceptedLinesAdded: number;
	acceptedLinesDeleted: number;
	totalApplies: number;
	totalAccepts: number;
	totalRejects: number;
	totalTabsShown: number;
	totalTabsAccepted: number;
	composerRequests: number;
	chatRequests: number;
	agentRequests: number;
	cmdkUsages: number;
	subscriptionIncludedReqs: number;
	apiKeyReqs: number;
	usageBasedReqs: number;
	bugbotUsages: number;
	mostUsedModel: string;
	applyMostUsedExtension?: string;
	tabMostUsedExtension?: string;
	clientVersion?: string;
	email?: string; // User email (when available)
}

export interface CursorDailyUsageResponse {
	data: DailyUsageData[];
	period: {
		startDate: number;
		endDate: number;
	};
}

export class CursorAdminApi {
	constructor(private apiKey: string) {}

	/**
	 * Fetch all team members from Cursor Admin API
	 */
	async fetchTeamMembers(): Promise<CursorUser[]> {
		try {
			const response = await axios.get<CursorTeamMembersResponse>(
				`${CURSOR_API_BASE_URL}/teams/members`,
				{
					auth: {
						username: this.apiKey,
						password: "", // Password is empty as per Cursor API docs
					},
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
			return response.data.teamMembers.filter(
				(member) => member.role === "member",
			);
		} catch (error) {
			console.error("Error fetching team members:", error);
			if (axios.isAxiosError(error)) {
				console.error("API error details:", error.response?.data);
			}
			throw error;
		}
	}

	/**
	 * Fetch daily usage data for the team within specified date range
	 * @param startDateEpochMs Start date in epoch milliseconds
	 * @param endDateEpochMs End date in epoch milliseconds
	 */
	async fetchDailyUsageData(
		startDateEpochMs: number,
		endDateEpochMs: number,
	): Promise<CursorDailyUsageResponse> {
		try {
			const response = await axios.post<CursorDailyUsageResponse>(
				`${CURSOR_API_BASE_URL}/teams/daily-usage-data`,
				{
					startDate: startDateEpochMs,
					endDate: endDateEpochMs,
				},
				{
					auth: {
						username: this.apiKey,
						password: "",
					},
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
			return response.data;
		} catch (error) {
			console.error("Error fetching daily usage data:", error);
			if (axios.isAxiosError(error)) {
				console.error("API error details:", error.response?.data);
			}
			throw error;
		}
	}
}
