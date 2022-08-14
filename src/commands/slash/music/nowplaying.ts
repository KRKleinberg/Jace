import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildMember,
	SlashCommandBuilder,
} from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder()
		.setName('nowplaying')
		.setDescription('Displays currently playing song'),

	async execute(interaction: ChatInputCommandInteraction) {
		const member = interaction.member as GuildMember;

		if (!member.voice.channel) {
			return interaction.reply({
				content: '❌ | You are not in a voice channel!',
				ephemeral: true,
			});
		}

		const queue = player.getQueue(interaction.guild!);

		if (!queue || !queue.playing) return interaction.reply({ content: '❌ | No music is playing!' });

		const progress = queue.createProgressBar();
		const timestamp = queue.getPlayerTimestamp();
		const embed = new EmbedBuilder()
			.setColor(0x5864f1)
			.setDescription(`🎶 | **${queue.current.title}** (\`${timestamp.progress}%\`)`)
			.setFields([
				{
					name: '\u200b',
					value: progress,
				},
			])
			.setTitle('Now Playing');

		return interaction.reply({ embeds: [embed] });
	},
};
