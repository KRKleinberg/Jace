import { Client, Message } from "discord.js";

export default {
	name: "ping",
	aliases: [],
	description: "Returns websocket ping",
	options: [],
	run: async (client: Client, message: Message) => {
		message.channel.send({ content: `📶 | \`${client.ws.ping}ms\`` });
	},
};
