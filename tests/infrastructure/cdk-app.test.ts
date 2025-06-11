import * as cdk from "aws-cdk-lib";
import { CursorActiveUsersBotStack } from "../../lib/cursor-active-users-bot-stack";

// Mock environment variables for testing
const mockEnv = {
	AWS_ACCOUNT: "123456789012",
	AWS_REGION: "us-east-1",
};

// Mock the bin file behavior
describe("CDK App Entry Point Tests", () => {
	beforeEach(() => {
		jest.resetModules();
		// NOTE: We don't mutate process.env here, just reset modules
	});

	it("should create CDK app with correct stack configuration", () => {
		// Create app and stack with explicit environment values instead of mutating process.env
		const app = new cdk.App();
		const stack = new CursorActiveUsersBotStack(
			app,
			"CursorActiveUsersBotStack",
			{
				env: {
					account: mockEnv.AWS_ACCOUNT,
					region: mockEnv.AWS_REGION,
				},
			},
		);

		expect(stack).toBeInstanceOf(CursorActiveUsersBotStack);
		expect(stack.account).toBe("123456789012");
		expect(stack.region).toBe("us-east-1");
		expect(stack.stackName).toBe("CursorActiveUsersBotStack");
	});

	it("should handle different AWS regions correctly", () => {
		const regions = ["us-east-1", "us-west-2", "eu-west-1"];

		for (const region of regions) {
			const app = new cdk.App();
			const stack = new CursorActiveUsersBotStack(app, `TestStack-${region}`, {
				env: {
					account: mockEnv.AWS_ACCOUNT,
					region: region,
				},
			});

			expect(stack.region).toBe(region);
		}
	});

	describe("CDK App Synthesis", () => {
		it("should synthesize without errors", () => {
			const app = new cdk.App();
			new CursorActiveUsersBotStack(app, "SynthTestStack", {
				env: {
					account: mockEnv.AWS_ACCOUNT,
					region: mockEnv.AWS_REGION,
				},
			});

			expect(() => {
				app.synth();
			}).not.toThrow();
		});

		it("should produce consistent synthesis output", () => {
			const app1 = new cdk.App();
			new CursorActiveUsersBotStack(app1, "ConsistencyTestStack1", {
				env: {
					account: mockEnv.AWS_ACCOUNT,
					region: mockEnv.AWS_REGION,
				},
			});

			const app2 = new cdk.App();
			new CursorActiveUsersBotStack(app2, "ConsistencyTestStack2", {
				env: {
					account: mockEnv.AWS_ACCOUNT,
					region: mockEnv.AWS_REGION,
				},
			});

			const synthesis1 = app1.synth();
			const synthesis2 = app2.synth();

			// Both should have the same stack template (ignoring stack names)
			const stack1Template = synthesis1.getStackByName(
				"ConsistencyTestStack1",
			).template;
			const stack2Template = synthesis2.getStackByName(
				"ConsistencyTestStack2",
			).template;

			// Compare resource types and counts
			const getResourceTypes = (template: any) => {
				const resources = template.Resources || {};
				return Object.values(resources)
					.map((resource: any) => resource.Type)
					.sort();
			};

			expect(getResourceTypes(stack1Template)).toEqual(
				getResourceTypes(stack2Template),
			);
		});
	});
});
