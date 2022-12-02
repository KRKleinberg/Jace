import { bold, Message } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'skip',
		aliases: ['forceskip', 'fs', 'next'],
		description: 'Skips current track',
	},

	async execute(message: Message) {
		const queue = player.getQueue(message.guild!);

		const currentTrack = queue!.current.title;

		if (!message.member!.voice.channel)
			return message.channel.send({ content: '❌ | You are not in a voice channel!' });

		if (!queue || !queue.playing) return message.channel.send({ content: '❌ | No music is playing!' });

		queue.skip();

		return message.channel.send({ content: `⏭️ | Skipped ${bold(currentTrack)}!` });
	},
};

