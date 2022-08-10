import { ChatInputCommandInteraction, Client } from "discord.js";

export default {
	name: "ping",
	description: "Returns websocket ping",
	run: async (client: Client, interaction: ChatInputCommandInteraction) => {
		await interaction.reply(`📶 | \`${client.ws.ping}ms\``);
	},
};
