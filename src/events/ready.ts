import { App } from '#utils/app';
import { env } from '#utils/env';
import { log } from '#utils/log';
import { Database } from '#utils/mongodb';
import { Player } from '#utils/player';
import { Redis } from '#utils/redis';
import { ActivityType, Events, REST, Routes } from 'discord.js';
import { readFileSync } from 'fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

App.once(Events.ClientReady, async () => {
	if (!App.user) {
		throw new Error('[Ready] Error: App.user is undefined!');
	}

	try {
		const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);

		await rest.put(Routes.applicationCommands(env.DISCORD_APP_ID), {
			body: App.commands.map((command) => command.data),
		});

		log.debug('[Ready] Application commands registered');
	} catch (error) {
		log.error('[Ready] Failed to register application commands:', error);
	}

	if (!Redis.isNewInstance) {
		log.info('[Ready] Existing instance detected, requesting handoff...');

		const subscriber = Redis.client.duplicate();

		await new Promise<void>((resolve) => {
			const timeout = setTimeout(() => {
				log.warn('[Ready] Handoff timed out, proceeding without handoff');

				resolve();
			}, 5000);

			void (async () => {
				try {
					await subscriber.connect();
					await subscriber.subscribe('jace:handoff:ready', async () => {
						clearTimeout(timeout);

						log.info('[Ready] Received handoff ready signal, proceeding with startup');

						resolve();
					});

					await Redis.client.publish('jace:handoff:request', 'Requesting handoff');

					log.info('[Ready] Requesting handoff from existing instance...');
				} catch (error) {
					log.error('[Ready] Handoff error:', error);

					clearTimeout(timeout);

					resolve();
				}
			})();
		});

		try {
			await subscriber.unsubscribe();
			subscriber.destroy();
		} catch (error) {
			// If the subscriber is already closed, we can ignore the error
		}
	}

	await Redis.client.set('jace:instance', Redis.instanceId);

	try {
		await Player.init({ id: App.user.id, username: App.user.username });
	} catch (error) {
		log.error('[Ready] Lavalink initialization failed:', error);
	}

	log.info(
		`[Ready] Logged in as ${App.user.tag} (ID: ${App.user.id}, Prefix: ${Database.getPreferences().prefix})`,
	);
});
