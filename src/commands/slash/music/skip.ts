import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder().setName('skip').setDescription('Skips the current song'),

	async execute(interaction: ChatInputCommandInteraction) {
		const queue = player.getQueue(interaction.guild!);
		const currentTrack = queue.current;

		if (!(interaction.member as GuildMember).voice.channel)
			return interaction.reply({ content: '❌ | You are not in a voice channel!' });
		if (!queue || !queue.playing)
			return interaction.reply({ content: '❌ | No music is playing!' });

		return interaction.reply({
			content: queue.skip() ? `⏭️ | Skipped **${currentTrack}**!` : '❌ | Something went wrong!',
		});
	},
};
