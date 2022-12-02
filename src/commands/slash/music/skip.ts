import { bold, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder().setName('skip').setDescription('Skips current track'),

	async execute(interaction: ChatInputCommandInteraction) {
		const member = interaction.member as GuildMember;
		const queue = player.getQueue(interaction.guild!);
		const currentTrack = queue!.current.title;

		if (!member.voice.channel)
			return interaction.reply({ content: '❌ | You are not in a voice channel!' });

		if (!queue || !queue.playing) return interaction.reply({ content: '❌ | No music is playing!' });

		queue.skip();

		return interaction.reply({ content: `⏭️ | Skipped ${bold(currentTrack)}!` });
	},
};
