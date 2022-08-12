import { EmbedBuilder, Message } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: {
		name: 'queue',
		aliases: ['q'],
		description: 'Displays the queue',
	},

	async execute(message: Message) {
		if (!message.member!.voice.channel)
			return message.channel.send({ content: '❌ | You are not in a voice channel!' });

		const queue = player.getQueue(message.guild!);

		if (!queue || !queue.playing) return message.channel.send({ content: '❌ | No music is playing!' });

		const currentTrack = queue.current;

		const tracks = queue.tracks
			.slice(0, 10)
			.map((m, i) => `${i + 1}. **${m.title}** ([link](${m.url}))`);

		console.log(tracks);

		const embed = new EmbedBuilder()
			.setColor('#5864f1')
			// .setDescription(tracks.join('\n'))
			.setFields([
				{ name: 'Now Playing', value: `🎶 | **${currentTrack.title}** ([link](${currentTrack.url}))` },
			])
			.setTitle('Queue');

		return message.channel.send({ embeds: [embed] });
	},
};

