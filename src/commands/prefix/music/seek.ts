import { inlineCode, Message } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'seek',
		description: 'Seeks to the given time in seconds',
		options: [`${inlineCode('seconds')}`],
	},

	async execute(message: Message, args: string[]) {
		if (!message.member!.voice.channel) {
			return message.channel.send({
				content: '❌ | You are not in a voice channel!',
			});
		}

		const queue = player.getQueue(message.guild!);

		if (!queue || !queue.playing) return message.channel.send({ content: '❌ | No music is playing!' });

		const ms = parseInt(args[0], 10) * 1000;

		return message.channel.send(
			(await queue.seek(ms))
				? { content: `⏩ | Seeked to ${ms / 1000} seconds` }
				: { content: '❌ | Please enter a valid time to seek!' }
		);
	},
};
