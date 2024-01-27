import { Bot } from '@utils/bot';
import { DynamoDB } from '@utils/dynamodb';
import { ActivityType, Events, REST, Routes } from 'discord.js';
import express from 'express';

export const event: Bot.Event = {
	async execute() {
		Bot.client.once(Events.ClientReady, async () => {
			if (process.env.DISCORD_APP_ID == null) throw new Error('DISCORD_APP_ID is not set!');
			if (process.env.DISCORD_BOT_TOKEN == null) throw new Error('DISCORD_BOT_TOKEN is not set!');

			const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
			const defaultPrefs = await DynamoDB.Tables.getDefaultPrefs();
			const defaultPrefix = defaultPrefs.prefix;

			try {
				await rest.put(Routes.applicationCommands(process.env.DISCORD_APP_ID), {
					body: Bot.commands.map((command) => command.data),
				});
			} catch (error) {
				console.error(error);
			}

			Bot.client.user?.setPresence({
				status: 'online',
				activities: [
					{
						name: `📻 | ${defaultPrefix}help | v${process.env.npm_package_version}`,
						type: ActivityType.Custom,
					},
				],
			});

			// Listen for health check
			const app = express();

			app.get('/health', (_req, res) => {
				console.log('Health check requested');

				res.status(200).end('OK');
			});
			app.listen(process.env.PORT);

			console.log(`${Bot.client.user?.tag} is online! Prefix set as "${defaultPrefix}"`);
		});
	},
};
