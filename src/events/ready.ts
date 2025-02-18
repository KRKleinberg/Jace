import { App } from '#utils/app';
import { Data } from '#utils/data';
import { Player } from '#utils/player';
import { Events, REST, Routes } from 'discord.js';

export const event: App.Event = {
	run() {
		App.client.once(Events.ClientReady, async () => {
			// REST API
			if (!process.env.DISCORD_BOT_TOKEN) {
				throw new Error('Environment variable "DISCORD_BOT_TOKEN" is not set!');
			}
			if (!process.env.DISCORD_APP_ID) {
				throw new Error('Environment variable "DISCORD_BOT_TOKEN" is not set!');
			}

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
			process.on('uncaughtException', async (error) => {
				console.error(`EXCEPTION CAUGHT: ${error}\n` + `EXCEPTION ORIGIN: ${error.stack ?? 'Unknown'}`);

				// Reset player
				await Player.initializePlayer();
			});
			process.on('unhandledRejection', async (reason, promise) => {
				console.error('UNHANDLED REJECTION:', promise, 'REASON:', reason);

				// Reset player
				await Player.initializePlayer();
			});

			// Log Start
			console.log(
				`${App.client.user?.tag ?? 'UNDEFINED_TAG'} is online! Prefix set as "${preferences.prefix}"`
			);
		});
	},
};
