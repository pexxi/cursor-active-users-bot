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
	 * @param usersToRemove Array of users to be removed
	 * @param inactiveDays Number of days users have been inactive
	 */
	async sendRemovalCandidatesNotification(
		recipientUserId: string,
		usersToRemove: InactiveUser[],
		inactiveDays: number,
	): Promise<void> {
		if (usersToRemove.length === 0) {
			console.log("No users for removal to report.");
			return;
		}

		// Look up Slack usernames for each user to be removed
		const messageLines = await Promise.all(
			usersToRemove.map(async (user) => {
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

		const messageText = `Cursor license removal candidates (no activity for ${inactiveDays}+ days):\n${messageLines.join("\n")}`;

		console.log("Sending Slack message for users to remove:", messageText);

		try {
			await this.app.client.chat.postMessage({
				channel: recipientUserId,
				text: messageText,
			});
			console.log("Removal candidates notification sent successfully.");
		} catch (error) {
			console.error(
				"Error sending removal candidates notification:",
				JSON.stringify(error, null, 2),
			);
			throw error;
		}
	}

	/**
	 * Send an inactivity warning DM to a specific user
	 * @param userEmail Email of the user to send DM to
	 * @param inactiveDays Number of days the user has been inactive
	 * @returns Promise<boolean> - true if message was sent successfully, false otherwise
	 */
	async sendInactivityWarningDM(
		userEmail: string,
		inactiveDays: number,
	): Promise<boolean> {
		try {
			// Look up the user by email
			const slackUser = await this.app.client.users.lookupByEmail({
				email: userEmail,
			});

			if (!slackUser.user?.id) {
				console.warn(`Could not find Slack user ID for email: ${userEmail}`);
				return false;
			}

			const messageText = `You haven't used Cursor for ${inactiveDays} days. If you are planning to not use the app, please inform IT so we can remove the license.`;

			await this.app.client.chat.postMessage({
				channel: slackUser.user.id,
				text: messageText,
			});

			console.log(`Inactivity warning DM sent successfully to ${userEmail}`);
			return true;
		} catch (error) {
			console.warn(
				`Failed to send inactivity warning DM to ${userEmail}:`,
				JSON.stringify(error, null, 2),
			);
			return false;
		}
	}

	/**
	 * Send a direct message to a specific user about inactive Cursor users
	 * @param recipientUserId Slack user ID to send the message to
	 * @param inactiveUsers Array of inactive users
	 * @deprecated Use sendRemovalCandidatesNotification instead
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
