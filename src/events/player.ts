import * as App from '@utils/app';
import { GuildQueueEvent } from 'discord-player';
import {
	type AnySelectMenuInteraction,
	type CacheType,
	type ChatInputCommandInteraction,
	type Message,
} from 'discord.js';

export const event: App.Event = {
	async execute() {
		/**
		 * Debug
		 * App.player.events.on(GuildQueueEvent.debug, (_queue, message) => console.log(message));
		 */

		App.player.events.on(GuildQueueEvent.error, async (_queue, error) => {
			console.error(error);
		});

		App.player.events.on(GuildQueueEvent.playerError, async (queue, error, track) => {
			const command:
				| ChatInputCommandInteraction<CacheType>
				| AnySelectMenuInteraction
				| Message<boolean> = queue.metadata;

			console.error(error);

			try {
				if (!queue.isPlaying()) await queue.node.play();
			} catch (error) {
				console.error(error);
			}

			return await App.respond(
				command,
				`⚠️ | There was an error playing **${track.title}** by **${track.author}**`,
				{ channelSend: true }
			);
		});

		App.player.events.on(GuildQueueEvent.playerStart, async (queue, track) => {
			const command:
				| ChatInputCommandInteraction<CacheType>
				| AnySelectMenuInteraction
				| Message<boolean> = queue.metadata;

			return await App.respond(command, `🎵 | Playing **${track.title}** by **${track.author}**`, {
				channelSend: true,
			});
		});
	},
};
