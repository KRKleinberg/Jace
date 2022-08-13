import { bold, Message } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'skip',
		aliases: ['fs'],
		description: 'Skips the current song',
	},

	async execute(message: Message) {
		const queue = player.getQueue(message.guild!);

		const currentTrack = queue.current.toString();

		if (!message.member!.voice.channel)
			return message.channel.send({ content: '❌ | You are not in a voice channel!' });

		if (!queue || !queue.playing) return message.channel.send({ content: '❌ | No music is playing!' });

		return message.channel.send({
			content: queue.skip() ? `⏭️ | Skipped ${bold(currentTrack)}!` : '❌ | Something went wrong!',
		});
	},
};
