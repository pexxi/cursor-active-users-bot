import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { CursorActiveUsersBotStack } from "../../lib/cursor-active-users-bot-stack";
import { processS3Keys } from "../serializers/s3-key-serializer";

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
			const templateJson = template.toJSON();
			expect(processS3Keys(templateJson)).toMatchSnapshot();
		});
	});

	describe("Lambda Function", () => {
		it("should create a Lambda function with correct properties", () => {
			template.hasResourceProperties("AWS::Lambda::Function", {
				Runtime: "nodejs22.x",
				Handler: "index.handler",
				MemorySize: 512,
				Timeout: 300,
			});
		});

		it("should have environment variables for configuration", () => {
			const lambdaResources = template.findResources("AWS::Lambda::Function");
			const lambdaResource = Object.values(lambdaResources)[0] as any;

			expect(
				lambdaResource.Properties.Environment.Variables.SECRETS_ARN,
			).toBeDefined();
			expect(
				lambdaResource.Properties.Environment.Variables.SECRETS_ARN.Ref,
			).toBeDefined();
			expect(
				lambdaResource.Properties.Environment.Variables.NOTIFY_AFTER_DAYS,
			).toBe("60");
			expect(
				lambdaResource.Properties.Environment.Variables.REMOVE_AFTER_DAYS,
			).toBe("90");
		});

		it("should match Lambda function snapshot", () => {
			const lambdaResources = template.findResources("AWS::Lambda::Function");
			expect(processS3Keys(lambdaResources)).toMatchSnapshot(
				"lambda-functions",
			);
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
			expect(processS3Keys(secretResources)).toMatchSnapshot("secrets-manager");
		});
	});

	describe("EventBridge Rule", () => {
		it("should create a scheduled rule for weekly execution", () => {
			template.hasResourceProperties("AWS::Events::Rule", {
				ScheduleExpression: "cron(0 9 ? * MON *)",
				Description:
					"Triggers the inactive user checker Lambda function weekly on Mondays at 9 AM UTC.",
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
			expect(processS3Keys(ruleResources)).toMatchSnapshot("eventbridge-rules");
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

			expect(
				processS3Keys({
					roles: iamRoles,
					policies: iamPolicies,
					permissions: lambdaPermissions,
				}),
			).toMatchSnapshot("iam-resources");
		});
	});

	describe("CloudFormation Outputs", () => {
		it("should create output for Lambda function name", () => {
			template.hasOutput("LambdaFunctionName", {
				Description: "Name of the Inactive User Checker Lambda function",
			});
		});

		it("should create output for schedule information", () => {
			template.hasOutput("ScheduleInfo", {
				Description: "Lambda execution schedule",
			});
		});

		it("should match outputs snapshot", () => {
			const outputs = template.toJSON().Outputs;
			expect(processS3Keys(outputs)).toMatchSnapshot("cloudformation-outputs");
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

			expect(processS3Keys(resourceCounts)).toMatchSnapshot("resource-counts");
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
