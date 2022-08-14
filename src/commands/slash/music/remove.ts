import { bold, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Removes a track from the queue')
		.addNumberOption((option) =>
			option
				.setName('trackNumber')
				.setDescription('The number of the track to remove from the queue')
				.setRequired(true)
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

		const trackIndex = interaction.options.getNumber('track number')! - 1;
		const trackName = queue.tracks[trackIndex].title;

		return interaction.reply(
			queue.remove(trackIndex)
				? { content: `🗑️ | Removed ${bold(trackName)}.` }
				: { content: '❌ | Please enter a valid track number!', ephemeral: true }
		);
	},
};
