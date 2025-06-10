import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { CursorActiveUsersBotStack } from "../../lib/cursor-active-users-bot-stack";

// Mock environment variables for consistent testing
const mockEnv = {
	AWS_ACCOUNT: "123456789012",
	AWS_REGION: "us-east-1",
};

describe("CursorActiveUsersBotStack Infrastructure Tests", () => {
	let app: cdk.App;
	let stack: CursorActiveUsersBotStack;
	let template: Template;

	beforeEach(() => {
		// Create CDK app and stack with explicit environment configuration
		// NOTE: We pass environment values directly to the stack instead of mutating process.env
		app = new cdk.App();
		stack = new CursorActiveUsersBotStack(app, "TestStack", {
			env: {
				account: mockEnv.AWS_ACCOUNT,
				region: mockEnv.AWS_REGION,
			},
		});
		template = Template.fromStack(stack);
	});

	describe("Complete Stack Snapshot", () => {
		it("should match the complete CloudFormation template snapshot", () => {
			expect(template.toJSON()).toMatchSnapshot();
		});
	});

	describe("Lambda Function", () => {
		it("should create a Lambda function with correct properties", () => {
			template.hasResourceProperties("AWS::Lambda::Function", {
				Runtime: "nodejs22.x",
				Handler: "index.handler",
				MemorySize: 256,
				Timeout: 60,
			});
		});

		it("should have environment variable for secrets ARN", () => {
			const lambdaResources = template.findResources("AWS::Lambda::Function");
			const lambdaResource = Object.values(lambdaResources)[0] as any;

			expect(
				lambdaResource.Properties.Environment.Variables.SECRETS_ARN,
			).toBeDefined();
			expect(
				lambdaResource.Properties.Environment.Variables.SECRETS_ARN.Ref,
			).toBeDefined();
		});

		it("should match Lambda function snapshot", () => {
			const lambdaResources = template.findResources("AWS::Lambda::Function");
			expect(lambdaResources).toMatchSnapshot("lambda-functions");
		});
	});

	describe("Secrets Manager", () => {
		it("should create a secret with correct name and description", () => {
			template.hasResourceProperties("AWS::SecretsManager::Secret", {
				Name: "CursorActiveUserBotSecrets",
				Description: "API keys for Cursor and Slack bots",
			});
		});

		it("should create secret with placeholder values", () => {
			// Verify the secret contains the expected keys
			const secretResources = template.findResources(
				"AWS::SecretsManager::Secret",
			);
			const secretResource = Object.values(secretResources)[0] as any;
			const secretString = secretResource.Properties.SecretString;

			expect(secretString).toBeDefined();
			expect(secretString).toContain("CURSOR_API_KEY");
			expect(secretString).toContain("SLACK_BOT_TOKEN");
			expect(secretString).toContain("SLACK_USER_ID");
		});

		it("should match Secrets Manager snapshot", () => {
			const secretResources = template.findResources(
				"AWS::SecretsManager::Secret",
			);
			expect(secretResources).toMatchSnapshot("secrets-manager");
		});
	});

	describe("EventBridge Rule", () => {
		it("should create a scheduled rule for monthly execution", () => {
			template.hasResourceProperties("AWS::Events::Rule", {
				ScheduleExpression: "cron(0 0 1 * ? *)",
				Description:
					"Triggers the inactive user checker Lambda function monthly.",
				State: "ENABLED",
			});
		});

		it("should target the Lambda function", () => {
			const ruleResources = template.findResources("AWS::Events::Rule");
			const ruleResource = Object.values(ruleResources)[0] as any;

			expect(ruleResource.Properties.Targets).toHaveLength(1);
			expect(
				ruleResource.Properties.Targets[0].Arn["Fn::GetAtt"],
			).toBeDefined();
			expect(ruleResource.Properties.Targets[0].Arn["Fn::GetAtt"][1]).toBe(
				"Arn",
			);
			expect(ruleResource.Properties.Targets[0].Id).toBe("Target0");
		});

		it("should match EventBridge rule snapshot", () => {
			const ruleResources = template.findResources("AWS::Events::Rule");
			expect(ruleResources).toMatchSnapshot("eventbridge-rules");
		});
	});

	describe("IAM Permissions", () => {
		it("should create IAM role for Lambda execution", () => {
			template.hasResourceProperties("AWS::IAM::Role", {
				AssumeRolePolicyDocument: {
					Statement: [
						{
							Action: "sts:AssumeRole",
							Effect: "Allow",
							Principal: {
								Service: "lambda.amazonaws.com",
							},
						},
					],
				},
			});
		});

		it("should grant Lambda permission to read secrets", () => {
			const policyResources = template.findResources("AWS::IAM::Policy");
			const policyResource = Object.values(policyResources)[0] as any;

			const statements = policyResource.Properties.PolicyDocument.Statement;
			const secretsStatement = statements.find((stmt: { Action?: string }) =>
				stmt.Action?.includes("secretsmanager:GetSecretValue"),
			);

			expect(secretsStatement).toBeDefined();
			expect(secretsStatement.Effect).toBe("Allow");
		});

		it("should create Lambda permission for EventBridge", () => {
			template.hasResourceProperties("AWS::Lambda::Permission", {
				Action: "lambda:InvokeFunction",
				Principal: "events.amazonaws.com",
			});
		});

		it("should match IAM resources snapshot", () => {
			const iamRoles = template.findResources("AWS::IAM::Role");
			const iamPolicies = template.findResources("AWS::IAM::Policy");
			const lambdaPermissions = template.findResources(
				"AWS::Lambda::Permission",
			);

			expect({
				roles: iamRoles,
				policies: iamPolicies,
				permissions: lambdaPermissions,
			}).toMatchSnapshot("iam-resources");
		});
	});

	describe("CloudFormation Outputs", () => {
		it("should create output for Lambda function name", () => {
			template.hasOutput("LambdaFunctionName", {
				Description: "Name of the Inactive User Checker Lambda function",
			});
		});

		it("should match outputs snapshot", () => {
			const outputs = template.toJSON().Outputs;
			expect(outputs).toMatchSnapshot("cloudformation-outputs");
		});
	});

	describe("Resource Counts", () => {
		it("should create the expected number of resources", () => {
			const resources = template.toJSON().Resources;
			const resourceCounts = Object.keys(resources).reduce(
				(acc, key) => {
					const resourceType = resources[key].Type;
					acc[resourceType] = (acc[resourceType] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>,
			);

			expect(resourceCounts).toMatchSnapshot("resource-counts");
		});
	});

	describe("Stack Properties", () => {
		it("should have correct stack properties", () => {
			expect(stack.account).toBe(mockEnv.AWS_ACCOUNT);
			expect(stack.region).toBe(mockEnv.AWS_REGION);
			expect(stack.stackName).toBe("TestStack");
		});
	});
});
