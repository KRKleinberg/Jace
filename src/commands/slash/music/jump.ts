import { bold, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder()
		.setName('jump')
		.setDescription('Jumps to particular track, removing other tracks on the way')
		.addNumberOption((option) =>
			option
				.setName('track')
				.setDescription('The number of the queued track to skip to')
				.setRequired(true)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		const member = interaction.member as GuildMember;

		if (!member.voice.channel)
			return interaction.reply({
				content: '❌ | You are not in a voice channel!',
				ephemeral: true,
			});

		const queue = player.getQueue(interaction.guild!);

		if (!queue || !queue.playing) return interaction.reply({ content: '❌ | No music is playing!' });

		const trackIndex = interaction.options.getNumber('track')! - 1;

		if (!queue.tracks[trackIndex])
			return interaction.reply({ content: '❌ | Please enter a valid track number!', ephemeral: true });

		queue.skipTo(trackIndex);

		return interaction.reply({ content: `↪️ | Jumped to ${bold(queue.tracks[trackIndex].title)}.` });
	},
};
