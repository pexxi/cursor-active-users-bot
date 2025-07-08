import { App } from "@slack/bolt";
import type { User } from "../types/users";

export class SlackApi {
	private app: App | null = null; // App instance, null if not enabled
	private enabled = true; // Default to enabled, can be set via constructor
	private userIdCache: Map<string, string>;

	constructor(botToken: string, signingSecret: string, enabled = false) {
		if (enabled) {
			this.app = new App({
				token: botToken,
				signingSecret,
			});
		} else {
			console.log("Slack notifications are disabled.");
		}
		this.enabled = enabled;
		this.userIdCache = new Map<string, string>();
	}

	/**
	 * Send a direct message to a specific user about inactive Cursor users
	 * @param recipientUserId Slack user ID to send the message to
	 * @param usersToRemove Array of users to be removed
	 * @param inactiveDays Number of days users have been inactive
	 */
	async sendChannelNotification(
		recipientUserId: string,
		usersToNotify: User[],
		usersToRemove: User[],
		appName: string,
	): Promise<boolean> {
		if (!recipientUserId) {
			console.warn("No recipient user ID provided for Slack notification.");
			return false;
		}

		const combinedUsers = new Set([...usersToNotify, ...usersToRemove]);
		for (const user of combinedUsers) {
			try {
				// Check cache first
				if (!this.userIdCache.has(user.email) && this.app) {
					const slackUser = await this.app.client.users.lookupByEmail({
						email: user.email,
					});
					if (slackUser.user?.id) {
						this.userIdCache.set(user.email, slackUser.user.id);
					} else {
						console.warn(`No Slack user ID found for email: ${user.email}`);
					}
				}
			} catch (error) {
				console.warn(`Error looking up Slack user for email ${user.email}:`, JSON.stringify(error, null, 2));
			}
		}

		let messageText = `${appName} inactive users:\n`;
		usersToNotify.forEach((user) => {
			const username = user.name;
			const email = user.email;
			const userId = this.userIdCache.get(user.email);
			messageText += `- :warning: ${username} (${email}${userId ? `, <@${userId}>` : ""}) \n`;
		});
		messageText += "\n";
		usersToRemove.forEach((user) => {
			const username = user.name;
			const email = user.email;
			const userId = this.userIdCache.get(user.email);
			messageText += `- :x: ${username} (${email}${userId ? `, <@${userId}>` : ""}) \n`;
		});

		console.log("Sending Slack message:\n", messageText);

		try {
			if (!this.app) {
				console.log("Slack disabled.");
				return false;
			}
			await this.app.client.chat.postMessage({
				channel: recipientUserId,
				text: messageText,
			});
			console.log("Removal candidates notification sent successfully.");
			return true;
		} catch (error) {
			console.error("Error sending removal candidates notification:", JSON.stringify(error, null, 2));
			return false;
		}
	}

	/**
	 * Send an inactivity warning DM to a specific user
	 * @param userEmail Email of the user to send DM to
	 * @param inactiveDays Number of days the user has been inactive
	 * @returns Promise<boolean> - true if message was sent successfully, false otherwise
	 */
	async sendInactivityWarningDM(userEmail: string, inactiveDays: number, appName: string): Promise<boolean> {
		if (!this.enabled) {
			console.log("Slack notifications are disabled.");
			return false;
		}
		try {
			// Check cache first
			let userId = this.userIdCache.get(userEmail) ?? "";
			if (!userId && this.app) {
				// Look up the user by email
				const slackUser = await this.app.client.users.lookupByEmail({
					email: userEmail,
				});

				if (!slackUser.user?.id) {
					console.warn(`Could not find Slack user ID for email: ${userEmail}`);
					return false;
				}

				this.userIdCache.set(userEmail, slackUser.user.id);
				userId = slackUser.user.id;
			}

			const messageText = `You haven't used ${appName} for ${inactiveDays} days. 
If you are planning to not use the app, please inform IT so we can remove the license.`;

			if (this.app) {
				await this.app.client.chat.postMessage({
					channel: userId,
					text: messageText,
				});
			}

			console.log(`Inactivity warning DM sent successfully to ${userEmail}`);
			return true;
		} catch (error) {
			console.warn(`Failed to send inactivity warning DM to ${userEmail}:`, JSON.stringify(error, null, 2));
			return false;
		}
	}
}
