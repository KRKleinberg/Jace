import { bold, inlineCode, Message } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'remove',
		aliases: ['del', 'delete', 'rm'],
		description: 'Removes a track from the queue',
		options: [`${inlineCode('track number')}`],
	},

	async execute(message: Message, args: string[]) {
		if (!message.member!.voice.channel) {
			return message.channel.send({
				content: '❌ | You are not in a voice channel!',
			});
		}

		const queue = player.getQueue(message.guild!);

		if (!queue || !queue.playing) return message.channel.send({ content: '❌ | No music is playing!' });

		const trackIndex = parseInt(args[0], 10) - 1;

		if (!trackIndex) return message.channel.send({ content: '❌ | You did not enter a track number!' });

		const trackName = queue.tracks[trackIndex].title;

		return message.channel.send(
			queue.remove(trackIndex)
				? { content: `🗑️ | Removed ${bold(trackName)}.` }
				: { content: '❌ | Please enter a valid track number!' }
		);
	},
};
