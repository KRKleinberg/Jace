export default {
	name: "ping",
	description: "Returns websocket ping",
	type: "CHAT_INPUT",
	run: async (client, interaction) => {
		interaction.followUp({ content: `📶 | \`${client.ws.ping}ms\`` });
	},
};
