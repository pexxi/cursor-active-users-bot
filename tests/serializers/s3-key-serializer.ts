/**
 * Custom Jest snapshot serializer that replaces dynamic S3 asset keys with static strings
 * This ensures consistent snapshots regardless of code changes that affect asset hashes
 */

// Regular expression to match S3 asset keys (typically 64-character hex strings)
const S3_KEY_REGEX = /^[a-f0-9]{64}\.zip$/;

// Static replacement string for S3 asset keys
const STATIC_S3_KEY = "STATIC_ASSET_KEY.zip";

export const s3KeySerializer = {
	test: (val: any): boolean => {
		// Test if the value is a string that looks like an S3 asset key
		return typeof val === "string" && S3_KEY_REGEX.test(val);
	},

	serialize: (_val: string): string => {
		// Replace the dynamic S3 key with a static one
		return `"${STATIC_S3_KEY}"`;
	},
};

/**
 * Recursively processes objects to replace S3 keys in nested structures
 * This is useful for complex objects like CloudFormation templates
 */
export const processS3Keys = (obj: any): any => {
	if (typeof obj === "string" && S3_KEY_REGEX.test(obj)) {
		return STATIC_S3_KEY;
	}

	if (Array.isArray(obj)) {
		return obj.map(processS3Keys);
	}

	if (obj && typeof obj === "object") {
		const processed: any = {};
		for (const [key, value] of Object.entries(obj)) {
			// Handle S3Key property specifically
			if (
				key === "S3Key" &&
				typeof value === "string" &&
				S3_KEY_REGEX.test(value)
			) {
				processed[key] = STATIC_S3_KEY;
			} else {
				processed[key] = processS3Keys(value);
			}
		}
		return processed;
	}

	return obj;
};

export default s3KeySerializer;
