import { ChatInputCommandInteraction } from "discord.js";
import { client } from "../../index.js";

export default {
	name: "ping",
	description: "Returns websocket ping",
	run: async (interaction: ChatInputCommandInteraction) => {
		await interaction.reply(`📶 | \`${client.ws.ping}ms\``);
	},
};
