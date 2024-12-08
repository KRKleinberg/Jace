import { App } from '#utils/app';
import { Data } from '#utils/data';
import { Events, REST, Routes } from 'discord.js';

export const event: App.Event = {
	execute() {
		App.client.once(Events.ClientReady, () => {
			void (async () => {
				// REST API
				if (process.env.DISCORD_APP_ID == null) throw new Error('DISCORD_APP_ID is not set!');
				if (process.env.DISCORD_BOT_TOKEN == null) throw new Error('DISCORD_BOT_TOKEN is not set!');

				const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
				const preferences = await Data.getPreferences();

				try {
					await rest.put(Routes.applicationCommands(process.env.DISCORD_APP_ID), {
						body: App.commands.map((command) => command.data),
					});
				} catch (error) {
					console.error(error);
				}

				// Prevent crashes on uncaught exceptions and unhandled promise rejections
				process.on('uncaughtException', (error) => {
					console.error(`EXCEPTION CAUGHT: ${error}\n` + `EXCEPTION ORIGIN: ${error.stack ?? 'Unknown'}`);
				});
				process.on('unhandledRejection', (reason, promise) => {
					console.error('UNHANDLED REJECTION:', promise, 'REASON:', reason);
				});

				// Log Start
				console.log(
					`${App.client.user?.tag ?? 'UNDEFINED_TAG'} is online! Prefix set as "${preferences.prefix}"`
				);
			})();
		});
	},
};
