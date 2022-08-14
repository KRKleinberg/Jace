import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder().setName('back').setDescription('Plays the previous track'),

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

		if (queue.previousTracks.length > 1)
			return interaction.reply({ content: '❌ | There are no previous tracks!', ephemeral: true });

		await queue.back();

		return interaction.reply({ content: '⏮️ | Playing the previous track!' });
	},
};
