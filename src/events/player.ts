import { useMainPlayer } from 'discord-player';
import { ChatInputCommandInteraction, Message } from 'discord.js';

const player = useMainPlayer();
if (!player) throw new Error('Player has not been initialized!');

player.events.on('error', (queue, error) => {
	const command = queue.metadata as ChatInputCommandInteraction | Message;

	console.log(error);

	const response = '⚠️ | The bot encountered an error';
	return command.channel?.send(response);
});

player.events.on('playerError', async (queue, error, track) => {
	const command = queue.metadata as ChatInputCommandInteraction | Message;

	console.error(error);

	try {
		if (!queue.isPlaying()) await queue.node.play();
	} catch (error) {
		console.error(error);
	}

	const response = `⚠️ | There was an error playing **${track.title}** by **${track.author}**`;
	return command.channel?.send(response);
});

player.events.on('playerStart', (queue, track) => {
	const command = queue.metadata as ChatInputCommandInteraction | Message;

	const response = `🎵 | Playing **${track.title}** by **${track.author}**`;
	return command.channel?.send(response);
});
