import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { player } from '../../../index.js';

export default {
	data: new SlashCommandBuilder()
		.setName('disconnect')
		.setDescription('Disconnects from voice channel'),

	async execute(interaction: ChatInputCommandInteraction) {
		let queue = player.getQueue(interaction.guild!);

		if (!queue || !queue.playing) queue = player.createQueue(interaction.guild!);

		queue.destroy();

		return interaction.reply({ content: '🔌 | Disconnected!' });
	},
};
