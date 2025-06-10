// Jest setup file
// Add any global test configuration here

// Set up default environment variables for testing
process.env.AWS_ACCOUNT = process.env.AWS_ACCOUNT || "123456789012";
process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";

global.console = {
	...console,
	// Uncomment to silence console.log during tests
	// log: jest.fn(),
	// error: jest.fn(),
	// warn: jest.fn(),
};
