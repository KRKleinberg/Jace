import * as Bot from '@utils/bot';
import * as DynamoDB from '@utils/dynamodb';
import { ActivityType, Events, REST, Routes } from 'discord.js';
import http from 'http';

export const event: Bot.Event = {
	async execute() {
		Bot.client.once(Events.ClientReady, async () => {
			// REST API
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

			// Set Presence
			Bot.client.user?.setActivity({
				name: `📻 | ${defaultPrefix}help | v${process.env.npm_package_version}`,
				type: ActivityType.Custom,
			});

			// Health Check
			http
				.createServer((_req, res) => {
					res.writeHead(200);
					res.end('OK');
				})
				.listen(process.env.HEALTH_PORT);

			// Log Start
			console.log(`${Bot.client.user?.tag} is online! Prefix set as "${defaultPrefix}"`);
		});
	},
};
