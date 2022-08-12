import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildMember,
	SlashCommandBuilder,
} from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder().setName('queue').setDescription('Displays the queue'),

	async execute(interaction: ChatInputCommandInteraction) {
		const member = interaction.member as GuildMember;

		if (!member.voice.channel)
			return interaction.reply({ content: '❌ | You are not in a voice channel!' });

		const queue = player.getQueue(interaction.guild!);

		if (!queue || !queue.playing) return interaction.reply({ content: '❌ | No music is playing!' });

		const currentTrack = queue.current;

		const tracks = queue.tracks
			.slice(0, 10)
			.map((m, i) => `${i + 1}. **${m.title}** ([link](${m.url}))`);

		const embed = new EmbedBuilder()
			.setColor('#5864f1')
			.setDescription(
				`${tracks.join('\n')}${
					queue.tracks.length > tracks.length
						? `\n...${
								queue.tracks.length - tracks.length === 1
									? `${queue.tracks.length - tracks.length} more track`
									: `${queue.tracks.length - tracks.length} more tracks`
						  }`
						: null
				}`
			)
			.setFields([
				{ name: 'Now Playing', value: `🎶 | **${currentTrack.title}** ([link](${currentTrack.url}))` },
			])
			.setTitle('Queue');

		return interaction.reply({ embeds: [embed] });
	},
};
