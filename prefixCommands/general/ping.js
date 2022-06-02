export const prefixCommand = {
	name: "ping",
	aliases: [],
	description: "Returns websocket ping",
	options: [],
	run: async (client, message) => {
		message.channel.send({ content: `📶 | \`${client.ws.ping}ms\`` });
	},
};