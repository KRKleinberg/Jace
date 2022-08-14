import { Message } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'disconnect',
		aliases: ['dc', 'leave'],
		description: 'Disconnects from voice channel',
	},

	async execute(message: Message) {
		let queue = player.getQueue(message.guild!);

		if (!queue || !queue.playing) queue = player.createQueue(message.guild!);

		queue.destroy();

		return message.channel.send({ content: '🔌 | Disconnected!' });
	},
};
