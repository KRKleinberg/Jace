import { Client, Message } from 'discord.js';

export default {
	data: {
		name: 'ping',
		description: 'Returns websocket ping',
	},
	async execute(client: Client, message: Message) {
		await message.channel.send({ content: `📶 | \`${client.ws.ping}ms\`` });
	},
};
