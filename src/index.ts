import { App } from '#utils/app';
import { env } from '#utils/env';
import { log } from '#utils/log';
import { Database } from '#utils/mongodb';
import { Player } from '#utils/player';
import { Redis } from '#utils/redis';
import { Events } from 'discord.js';

let shuttingDown = false;

process.on('SIGTERM', async () => {
	if (shuttingDown) return;

	shuttingDown = true;

	log.info('[Shutdown] Received SIGTERM, shutting down gracefully...');

	try {
		await subscriber.unsubscribe();
		subscriber.destroy();

		await new Promise<void>((resolve) => {
			const timeout = setTimeout(() => {
				log.warn('[Shutdown] Lavalink disconnect timed out');

				resolve();
			}, 5000);

			Player.nodeManager.once('disconnect', () => {
				clearTimeout(timeout);

				log.debug('[Shutdown] Lavalink connection released');

				// Wait to ensure the connection is fully closed before proceeding with session handoff
				setTimeout(resolve, 250);
			});

			Player.nodeManager.nodes.forEach((node) => {
				node.options.retryAmount = 0;
				node.disconnect('Session handoff');
			});
		});

		await Redis.client.publish('jace:handoff:ready', 'Done');
		await Redis.client.quit();

		await Database.destroy();
	} catch (error) {
		log.error('[Shutdown] Error:', error);
	}

	process.exit(0);
});

process.on('unhandledRejection', (error) => {
	log.error('[Process] Unhandled rejection:', error);
});
process.on('uncaughtException', (error) => {
	log.error('[Process] Uncaught exception:', error);

	process.exit(1);
});

const subscriber = Redis.client.duplicate();

await subscriber.connect();
await subscriber.subscribe('jace:handoff:request', async () => {
	const currentInstance = await Redis.client.get('jace:instance');

	if (currentInstance !== Redis.instanceId) return;

	App.removeAllListeners(Events.MessageCreate);
	App.removeAllListeners(Events.InteractionCreate);

	log.info('[Handoff] Received handoff request, shutting down...');

	process.emit('SIGTERM', 'SIGTERM');
});

await App.loadCommands();
await App.loadEvents();
await App.login(env.DISCORD_BOT_TOKEN);
