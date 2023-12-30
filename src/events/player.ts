import { Bot } from '@utils/bot';
import { GuildQueueEvent, useMainPlayer } from 'discord-player';
import { ChatInputCommandInteraction, Message } from 'discord.js';

export const event: Bot.Event = {
	async execute() {
		const player = useMainPlayer();

		player.events.on(GuildQueueEvent.error, async (queue, error) => {
			console.error(error);
		});

		player.events.on(GuildQueueEvent.playerError, async (queue, error, track) => {
			const command = queue.metadata as ChatInputCommandInteraction | Message;

			console.error(error);

			try {
				if (!queue.isPlaying()) await queue.node.play();
			} catch (error) {
				console.error(error);
			}

			return await Bot.respond(
				command,
				`⚠️ | There was an error playing **${track.title}** by **${track.author}**`,
				{ channelSend: true }
			);
		});

		player.events.on(GuildQueueEvent.playerStart, async (queue, track) => {
			const command = queue.metadata as ChatInputCommandInteraction | Message;

			return await Bot.respond(command, `🎵 | Playing **${track.title}** by **${track.author}**`, {
				channelSend: true,
			});
		});
	},
};
