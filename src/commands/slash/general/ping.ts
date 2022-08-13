import { ChatInputCommandInteraction, inlineCode, SlashCommandBuilder } from 'discord.js';
import { client } from '../../../index.js';

export default {
	data: new SlashCommandBuilder().setName('ping').setDescription('Returns websocket ping'),

	async execute(interaction: ChatInputCommandInteraction) {
		return interaction.reply(`📶 | ${inlineCode(client.ws.ping.toString())}ms`);
	},
};
