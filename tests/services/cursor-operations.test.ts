import { CursorOperations } from "../../src/services/cursor-operations";
import { CursorAdminApi } from "../../src/apis/cursor-admin-api";
import * as inactiveUsersAnalyzer from "../../src/services/inactive-users-analyzer";

// Mock the dependencies
jest.mock("../../src/services/cursor-admin-api");
jest.mock("../../src/services/inactive-users-analyzer");

const mockCursorAdminApi = CursorAdminApi as jest.MockedClass<
	typeof CursorAdminApi
>;
const mockInactiveUsersAnalyzer = inactiveUsersAnalyzer as jest.Mocked<
	typeof inactiveUsersAnalyzer
>;

describe("CursorOperations", () => {
	let cursorOperations: CursorOperations;
	const mockApiKey = "test-api-key";

	beforeEach(() => {
		jest.clearAllMocks();
		cursorOperations = new CursorOperations(mockApiKey);
	});

	describe("constructor", () => {
		it("should initialize with API key", () => {
			expect(mockCursorAdminApi).toHaveBeenCalledWith(mockApiKey);
		});
	});

	describe("getDateRanges", () => {
		it("should return date ranges for notification and removal periods", () => {
			const mockNotifyDateRange = {
				startDateEpochMs: 1000,
				endDateEpochMs: 2000,
			};
			const mockRemoveDateRange = {
				startDateEpochMs: 500,
				endDateEpochMs: 2000,
			};

			mockInactiveUsersAnalyzer.getUsageDataDateRange
				.mockReturnValueOnce(mockNotifyDateRange)
				.mockReturnValueOnce(mockRemoveDateRange);

			const result = cursorOperations.getDateRanges(60, 90);

			expect(
				mockInactiveUsersAnalyzer.getUsageDataDateRange,
			).toHaveBeenCalledWith(60);
			expect(
				mockInactiveUsersAnalyzer.getUsageDataDateRange,
			).toHaveBeenCalledWith(90);
			expect(result).toEqual({
				notifyDateRange: mockNotifyDateRange,
				removeDateRange: mockRemoveDateRange,
			});
		});
	});

	describe("fetchTeamMembers", () => {
		it("should fetch team members successfully", async () => {
			const mockMembers = [
				{
					name: "John Doe",
					email: "john@example.com",
					role: "member" as const,
				},
			];

			const mockFetchTeamMembers = jest.fn().mockResolvedValue(mockMembers);
			(mockCursorAdminApi as any).mockImplementation(() => ({
				fetchTeamMembers: mockFetchTeamMembers,
			}));

			cursorOperations = new CursorOperations(mockApiKey);
			const result = await cursorOperations.fetchTeamMembers();

			expect(mockFetchTeamMembers).toHaveBeenCalled();
			expect(result).toEqual(mockMembers);
		});

		it("should return empty array when no members found", async () => {
			const mockFetchTeamMembers = jest.fn().mockResolvedValue([]);
			(mockCursorAdminApi as any).mockImplementation(() => ({
				fetchTeamMembers: mockFetchTeamMembers,
			}));

			cursorOperations = new CursorOperations(mockApiKey);
			const result = await cursorOperations.fetchTeamMembers();

			expect(result).toEqual([]);
		});

		it("should throw error when API call fails", async () => {
			const mockError = new Error("API Error");
			const mockFetchTeamMembers = jest.fn().mockRejectedValue(mockError);
			(mockCursorAdminApi as any).mockImplementation(() => ({
				fetchTeamMembers: mockFetchTeamMembers,
			}));

			cursorOperations = new CursorOperations(mockApiKey);

			await expect(cursorOperations.fetchTeamMembers()).rejects.toThrow(
				"Failed to fetch team members: API Error",
			);
		});
	});
});
