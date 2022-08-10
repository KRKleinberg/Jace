import { ChatInputCommandInteraction, Client } from "discord.js";

export default {
	name: "ping",
	description: "Returns websocket ping",
	run: async (client: Client, interaction: ChatInputCommandInteraction) => {
		interaction.followUp({ content: `📶 | \`${client.ws.ping}ms\`` });
	},
};
