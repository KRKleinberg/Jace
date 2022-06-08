export default {
	name: "ping",
	description: "Returns websocket ping",
	run: async (client, interaction) => {
		interaction.followUp({ content: `📶 | \`${client.ws.ping}ms\`` });
	},
};
