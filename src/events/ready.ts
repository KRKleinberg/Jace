import * as App from '@utils/app';
import * as DynamoDB from '@utils/dynamodb';
import { Events, REST, Routes } from 'discord.js';

export const event: App.Event = {
	async execute() {
		App.client.once(Events.ClientReady, () => {
			void (async () => {
				// REST API
				if (process.env.DISCORD_APP_ID == null) throw new Error('DISCORD_APP_ID is not set!');
				if (process.env.DISCORD_BOT_TOKEN == null) throw new Error('DISCORD_BOT_TOKEN is not set!');

				const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
				const defaultPrefs = await DynamoDB.getDefaultPrefs();
				const defaultPrefix = defaultPrefs.prefix;

				try {
					await rest.put(Routes.applicationCommands(process.env.DISCORD_APP_ID), {
						body: App.commands.map((command) => command.data),
					});
				} catch (error) {
					console.error(error);
				}

				// Log Start
				console.log(`${App.client.user?.tag} is online! Prefix set as "${defaultPrefix}"`);
			})();
		});
	},
};
