export default {
	name: "ping",
	description: "Returns websocket ping",
	run: async (client, interaction) => {
		interaction.deferReply({ content: `📶 | \`${client.ws.ping}ms\`` });
	},
};
