import { bold, EmbedBuilder, Message } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'nowplaying',
		aliases: ['np', 'current', 'currentsong', 'currentsonginfo'],
		description: 'Displays currently playing song',
	},

	async execute(message: Message) {
		if (!message.member!.voice.channel) {
			return message.channel.send({
				content: '❌ | You are not in a voice channel!',
			});
		}

		const queue = player.getQueue(message.guild!);

		if (!queue || !queue.playing) return message.channel.send({ content: '❌ | No music is playing!' });

		const progress = queue.createProgressBar();
		const embed = new EmbedBuilder()
			.setColor(0x5864f1)
			.setDescription(`🎶 | ${bold(queue.current.title)})`)
			.setFields([
				{
					name: '\u200b',
					value: progress,
				},
			])
			.setTitle('Now Playing');

		return message.channel.send({ embeds: [embed] });
	},
};
