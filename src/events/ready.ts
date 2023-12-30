import { Bot } from '@utils/bot';
import { DynamoDB } from '@utils/dynamodb';
import { ActivityType, Events, REST, Routes, type Client } from 'discord.js';

export const event: Bot.Event = {
	async execute(client: Client) {
		client.once(Events.ClientReady, async () => {
			if (process.env.DISCORD_APP_ID == null) throw new Error('DISCORD_APP_ID is not set!');
			if (process.env.DISCORD_BOT_TOKEN == null) throw new Error('DISCORD_BOT_TOKEN is not set!');

			const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
			const defaultPrefs = await DynamoDB.getDefaultPrefs();
			const defaultPrefix = defaultPrefs.prefix;

			try {
				await rest.put(Routes.applicationCommands(process.env.DISCORD_APP_ID), {
					body: Bot.commands.map((command) => command.data),
				});
			} catch (error) {
				console.error(error);
			}

			client.user?.setPresence({
				status: 'online',
				activities: [
					{
						name: `Frogger | ${defaultPrefix}help`,
						type: ActivityType.Playing,
					},
				],
			});

			console.log(`${client.user?.tag} is online! Prefix set as "${defaultPrefix}"`);
		});
	},
};
