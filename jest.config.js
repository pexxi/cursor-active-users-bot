module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/tests"],
	testMatch: ["**/tests/**/*.test.ts"],
	setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
	transform: {
		"^.+\\.ts$": "ts-jest",
	},
	collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
	testPathIgnorePatterns: ["/node_modules/", "/dist/", "/test/", "/cdk.out/"],
	coveragePathIgnorePatterns: [
		"/node_modules/",
		"/dist/",
		"/test/",
		"/cdk.out/",
	],
	moduleFileExtensions: ["ts", "js", "json"],
	testTimeout: 10000,
};
