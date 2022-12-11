import { bold, Message } from 'discord.js';

export default {
	data: {
		name: 'flip',
		aliases: ['coin', 'coinflip', 'flipcoin', 'headsortails'],
		description: 'Flips a coin',
	},
	async execute(message: Message) {
		return message.channel.send(`It's ${bold(`${Math.round(Math.random()) ? 'heads' : 'tails'}`)}!`);
	},
};
