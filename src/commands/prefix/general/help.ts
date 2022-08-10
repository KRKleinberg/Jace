import { Client, EmbedBuilder, Message } from 'discord.js';
import { prefixCommands } from '../../../index.js';

export default {
	data: {
		name: 'help',
		description: 'Displays a list of all prefix commands',
	},
	async execute(client: Client, message: Message) {
		const fields = prefixCommands
			.map((prefixCommand) => ({
				name: prefixCommand.data.aliases.length
					? `${prefixCommand.name} (${prefixCommand.aliases.join(', ')})`
					: `${prefixCommand.name}`,
				value: prefixCommand.options.length
					? `${prefixCommand.description}\nInput: ${prefixCommand.options.join(', ')}`
					: `${prefixCommand.description}`,
			}))
			.slice(0, 25);

		const embed = new EmbedBuilder()
			.setTitle('Prefix Commands')
			.setDescription(`Prefix: **${process.env.PREFIX}**`)
			.setColor('#5864f1')
			.addFields(fields);

		message.channel.send({
			embeds: [embed],
		});
	},
};
