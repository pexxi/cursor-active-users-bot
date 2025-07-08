import { App } from "@slack/bolt";
import type { SlackUser, User } from "../types/users";

export class SlackApi {
	private app: App | null = null; // App instance, null if not enabled
	private enabled = true; // Default to enabled, can be set via constructor
	private slackUserCache: Map<string, SlackUser>;

	constructor(botToken: string, signingSecret: string, enabled = false) {
		if (enabled) {
			this.app = new App({
				token: botToken,
				signingSecret,
			});
		}
		this.enabled = enabled;
		this.slackUserCache = new Map<string, SlackUser>();
	}

	async loadSlackUsersToCache(users: User[]): Promise<void> {
		for (const user of users) {
			try {
				// Check cache first
				if (!this.slackUserCache.has(user.email) && this.app) {
					const slackUser = await this.app.client.users.lookupByEmail({
						email: user.email,
					});
					if (slackUser.user?.id && !slackUser.user.deleted) {
						this.slackUserCache.set(user.email, slackUser.user);
					} else {
						console.warn(`No Slack user ID found for email: ${user.email}`);
					}
				}
			} catch (error) {
				console.warn(`Could not find Slack user for email ${user.email}:`, JSON.stringify(error, null, 2));
			}
		}
	}

	/**
	 * Send a direct message to a specific user about inactive Cursor users
	 * @param recipientUserId Slack user ID to send the message to
	 * @param usersToNotify Array of users to notify (inactive users)
	 * @param usersToRemove Array of users to be removed
	 * @param appName Application name
	 * @param context Optional context to distinguish between inactive vs removal scenarios
	 */
	async sendChannelNotification(
		recipientUserId: string,
		usersToNotify: User[],
		usersToRemove: User[],
		appName: string,
		context?: "inactive" | "removal",
	): Promise<void> {
		if (!this.enabled) {
			console.log("Slack notifications are disabled.");
			return;
		}

		// Handle inactive users notification
		if (usersToNotify.length > 0) {
			await this.sendInactiveUsersNotification(recipientUserId, usersToNotify, appName);
		} else if (usersToRemove.length > 0) {
			await this.sendRemovalCandidatesNotification(recipientUserId, usersToRemove, appName);
		} else {
			// Both arrays are empty - use context if provided, otherwise default to inactive
			if (context === "removal") {
				console.log("No users for removal to report.");
			} else {
				console.log("No inactive users to report.");
			}
		}
	}

	private async sendInactiveUsersNotification(
		recipientUserId: string,
		inactiveUsers: User[],
		appName: string,
	): Promise<void> {
		const todayMinus60Days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
		let messageText = `Inactive ${appName} users (no activity since ${todayMinus60Days.toLocaleDateString("fi")}):`;

		// Load Slack users to cache
		await this.loadSlackUsersToCache(inactiveUsers);

		for (const user of inactiveUsers) {
			const slackUser = this.slackUserCache.get(user.email);
			const userMention = slackUser?.id ? `, <@${slackUser.id}>` : "";
			messageText += `\n- ${user.name} (${user.email}${userMention})`;
		}

		if (!this.app) {
			console.log("Slack notifications are disabled.");
			return;
		}

		await this.app.client.chat.postMessage({
			channel: recipientUserId,
			text: messageText,
		});
	}

	private async sendRemovalCandidatesNotification(
		recipientUserId: string,
		usersToRemove: User[],
		appName: string,
	): Promise<void> {
		const inactiveDays = 90;
		let messageText = `${appName} license removal candidates (no activity for ${inactiveDays}+ days):`;

		// Load Slack users to cache
		await this.loadSlackUsersToCache(usersToRemove);

		for (const user of usersToRemove) {
			const slackUser = this.slackUserCache.get(user.email);
			const userMention = slackUser?.id ? `, <@${slackUser.id}>` : "";
			messageText += `\n- ${user.name} (${user.email}${userMention})`;
		}

		if (!this.app) {
			console.log("Slack notifications are disabled.");
			return;
		}

		await this.app.client.chat.postMessage({
			channel: recipientUserId,
			text: messageText,
		});
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
			if (!this.app) {
				console.log("Slack notifications are disabled.");
				return false;
			}

			// Try to lookup user by email
			const slackUserResponse = await this.app.client.users.lookupByEmail({
				email: userEmail,
			});

			if (!slackUserResponse.user?.id) {
				console.warn(`Could not find Slack user ID for email: ${userEmail}`);
				return false;
			}

			const messageText = `You haven't used ${appName} for ${inactiveDays} days. If you are planning to not use the app, please inform IT so we can remove the license.`;

			await this.app.client.chat.postMessage({
				channel: slackUserResponse.user.id,
				text: messageText,
			});

			return true;
		} catch (error) {
			console.warn(`Failed to send inactivity warning DM to ${userEmail}:`, JSON.stringify(error, null, 2));
			return false;
		}
	}
}
