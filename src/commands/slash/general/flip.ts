import { bold, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export default {
	data: new SlashCommandBuilder().setName('flip').setDescription('Flips a coin'),

	async execute(interaction: ChatInputCommandInteraction) {
		return interaction.reply(`It's ${bold(`${Math.round(Math.random()) ? 'heads' : 'tails'}`)}!`);
	},
};
