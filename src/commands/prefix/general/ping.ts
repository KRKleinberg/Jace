import { inlineCode, Message } from 'discord.js';
import { client } from '../../../index.js';

export default {
	data: {
		name: 'ping',
		description: 'Returns websocket ping',
	},

	async execute(message: Message) {
		return message.channel.send(`📶 | ${inlineCode(client.ws.ping.toString())}ms`);
	},
};
