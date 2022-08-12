import { Message } from 'discord.js';
import { client } from '../../../index.js';

export default {
	data: {
		name: 'ping',
		description: 'Returns websocket ping',
	},

	async execute(message: Message) {
		return message.channel.send(`📶 | \`${client.ws.ping}ms\``);
	},
};
