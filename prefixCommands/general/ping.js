export default {
	name: "ping",
	aliases: [],
	description: "Returns websocket ping",
	options: [],
	run: async (client, message, args) => {
		message.channel.send({ content: `📶 | \`${client.ws.ping}ms\`` });
	},
};
