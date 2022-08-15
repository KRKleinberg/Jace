import { Message } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'back',
		aliases: ['previous', 'prev'],
		description: 'Plays previous track',
	},

	async execute(message: Message) {
		if (!message.member!.voice.channel) {
			return message.channel.send({
				content: '❌ | You are not in a voice channel!',
			});
		}

		const queue = player.getQueue(message.guild!);

		if (!queue || !queue.playing) return message.channel.send({ content: '❌ | No music is playing!' });

		if (queue.previousTracks.length > 1)
			return message.channel.send({ content: '❌ | There are no previous tracks!' });

		await queue.back();

		return message.channel.send({ content: '⏮️ | Playing the previous track!' });
	},
};
