import { bold, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Removes a track from the queue')
		.addNumberOption((option) =>
			option.setName('track').setDescription('The number of the queued track to remove').setRequired(true)
		),
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

		const trackIndex = interaction.options.getNumber('track')!;

		if (!queue.tracks[trackIndex - 1])
			return interaction.reply({ content: '❌ | Please enter a valid track number!', ephemeral: true });

		queue.remove(trackIndex);

		return interaction.reply({ content: `🗑️ | Removed ${bold(queue.tracks[trackIndex - 1].title)}.` });
	},
};
