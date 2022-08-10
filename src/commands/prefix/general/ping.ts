import { Client, Message } from 'discord.js';

export default {
	data: {
		name: 'ping',
		aliases: [],
		description: 'Returns websocket ping',
		options: [],
	},
	async execute(client: Client, message: Message) {
		await message.channel.send({ content: `📶 | \`${client.ws.ping}ms\`` });
	},
};
