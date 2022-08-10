import { ChatInputCommandInteraction, Client, EmbedBuilder } from 'discord.js';
import { prefixCommands } from '../../../index.js';

export default {
	data: {
		name: 'help',
		description: 'Displays a list of all prefix commands',
	},
	async execute(client: Client, interaction: ChatInputCommandInteraction) {
		const fields = prefixCommands
			.map((prefixCommand) => ({
				name: prefixCommand.data.aliases
					? `${prefixCommand.name} (${prefixCommand.aliases.join(', ')})`
					: `${prefixCommand.name}`,
				value: prefixCommand.options
					? `${prefixCommand.description}\nInput: ${prefixCommand.options.join(', ')}`
					: `${prefixCommand.description}`,
			}))
			.slice(0, 25);

		const embed = new EmbedBuilder()
			.setTitle('Prefix Commands')
			.setDescription(`Prefix: **${process.env.PREFIX}**`)
			.setColor('#5864f1')
			.addFields(fields);

		interaction.reply({
			embeds: [embed],
		});
	},
};
