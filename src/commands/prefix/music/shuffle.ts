import { Message } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'shuffle',
		aliases: ['sh'],
		description: 'Shuffles the queue',
	},

	async execute(message: Message) {
		if (!message.member!.voice.channel) {
			return message.channel.send({
				content: '❌ | You are not in a voice channel!',
			});
		}

		const queue = player.getQueue(message.guild!);

		if (!queue || !queue.playing) return message.channel.send({ content: '❌ | No music is playing!' });

		queue.shuffle();

		return message.channel.send({ content: '🔀 | Queue has been shuffled!' });
	},
};
