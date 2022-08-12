import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { client } from '../../../index.js';

export default {
	data: new SlashCommandBuilder().setName('ping').setDescription('Returns websocket ping'),

	async execute(interaction: ChatInputCommandInteraction) {
		return interaction.reply(`📶 | \`${client.ws.ping}ms\``);
	},
};
