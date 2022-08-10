import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { prefixCommands } from '../../../index.js';

export default {
	data: {
		name: 'help',
		description: 'Displays a list of all prefix commands',
	},
	async execute(interaction: ChatInputCommandInteraction) {
		const fields = prefixCommands
			.map((prefixCommand) => ({
				name: prefixCommand.data.aliases.length
					? `${prefixCommand.data.name} (${prefixCommand.data.aliases.join(', ')})`
					: `${prefixCommand.data.name}`,
				value: prefixCommand.data.options.length
					? `${prefixCommand.data.description}\nInput: ${prefixCommand.data.options.join(', ')}`
					: `${prefixCommand.data.description}`,
			}))
			.slice(0, 25);

		const embed = new EmbedBuilder()
			.setTitle('Prefix Commands')
			.setDescription(`Prefix: **${process.env.PREFIX}**`)
			.setColor('#5864f1')
			.addFields(fields);

		interaction.followUp({
			embeds: [embed],
		});
	},
};
