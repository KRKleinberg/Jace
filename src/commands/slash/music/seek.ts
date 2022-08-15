import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder()
		.setName('seek')
		.setDescription('Seeks to the given time in seconds')
		.addIntegerOption((option) =>
			option.setName('seconds').setDescription('The time to seek in seconds').setRequired(true)
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

		const ms = interaction.options.getNumber('seconds')! * 1000;

		return interaction.reply(
			(await queue.seek(ms))
				? { content: `⏩ | Seeked to ${ms / 1000} seconds` }
				: { content: '❌ | Please enter a valid time to seek!', ephemeral: true }
		);
	},
};
