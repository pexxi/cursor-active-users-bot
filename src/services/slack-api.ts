import { App } from "@slack/bolt";

export interface InactiveUser {
	email: string;
	name: string;
}

export class SlackApi {
	private app: App;

	constructor(botToken: string, signingSecret: string) {
		this.app = new App({
			token: botToken,
			signingSecret,
		});
	}

	/**
	 * Send a direct message to a specific user about inactive Cursor users
	 * @param recipientUserId Slack user ID to send the message to
	 * @param inactiveUsers Array of inactive users
	 */
	async sendInactiveUsersNotification(
		recipientUserId: string,
		inactiveUsers: InactiveUser[],
	): Promise<void> {
		if (inactiveUsers.length === 0) {
			console.log("No inactive users to report.");
			return;
		}

		// Look up Slack usernames for each inactive user
		const messageLines = await Promise.all(
			inactiveUsers.map(async (user) => {
				try {
					const slackUser = await this.app.client.users.lookupByEmail({
						email: user.email,
					});

					const username = slackUser.user?.real_name ?? user.name;
					const email = slackUser.user?.profile?.email ?? user.email;
					const userId = slackUser.user?.id;

					return `- ${username} (${email}${userId ? `, <@${userId}>` : ""})`;
				} catch (error) {
					console.warn(
						`Could not find Slack user for email ${user.email}:`,
						JSON.stringify(error, null, 2),
					);
					return `- ${user.name} (${user.email})`;
				}
			}),
		);

		const todayMinus2Months = new Date(
			Date.now() - 2 * 30 * 24 * 60 * 60 * 1000,
		);
		const messageText = `Inactive Cursor users (no activity since ${todayMinus2Months.toLocaleDateString("fi")}):\n${messageLines.join("\n")}`;

		console.log("Sending Slack message for inactive users:", messageText);

		try {
			await this.app.client.chat.postMessage({
				channel: recipientUserId,
				text: messageText,
			});
			console.log("Slack message sent successfully.");
		} catch (error) {
			console.error(
				"Error sending Slack message:",
				JSON.stringify(error, null, 2),
			);
			throw error;
		}
	}

	/**
	 * Send a generic message to a user or channel
	 * @param channel Slack channel or user ID
	 * @param text Message text
	 */
	async sendMessage(channel: string, text: string): Promise<void> {
		try {
			await this.app.client.chat.postMessage({
				channel,
				text,
			});
			console.log(`Message sent successfully to ${channel}`);
		} catch (error) {
			console.error("Error sending Slack message:", error);
			throw error;
		}
	}
}
