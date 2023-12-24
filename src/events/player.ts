import { useMainPlayer } from 'discord-player';
import {
	type ChatInputCommandInteraction,
	type Event,
	type Message,
	type MessageCreateOptions,
	type MessagePayload,
} from 'discord.js';

export const event: Event = {
	async execute() {
		const player = useMainPlayer();
		if (player == null) throw new Error('Player has not been initialized!');

		player.events.on('error', async (queue, error) => {
			console.error(error);
		});

		player.events.on('playerError', async (queue, error, track) => {
			const command = queue.metadata as ChatInputCommandInteraction | Message;

			console.error(error);

			try {
				if (!queue.isPlaying()) await queue.node.play();
			} catch (error) {
				console.error(error);
			}

			const response:
				| string
				| MessagePayload
				| MessageCreateOptions = `⚠️ | There was an error playing **${track.title}** by **${track.author}**`;
			await command.channel?.send(response);
		});

		player.events.on('playerStart', async (queue, track) => {
			const command = queue.metadata as ChatInputCommandInteraction | Message;

			const response:
				| string
				| MessagePayload
				| MessageCreateOptions = `🎵 | Playing **${track.title}** by **${track.author}**`;
			await command.channel?.send(response);
		});
	},
};
