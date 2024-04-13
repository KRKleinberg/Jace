import * as Bot from '@utils/bot';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Bot.Command = {
	aliases: ['h'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Displays a list of commands'),
	async execute({ command, defaultPrefs, guildPrefs }) {
		try {
			const fields = Bot.commands.map((command) => {
				return {
					name:
						command.aliases?.length != null
							? `${command.data.name} (${command.aliases.join(', ')})`
							: `${command.data.name}`,
					value:
						command.data.options.length > 0
							? `${command.data.description}
				Input: \`${command.data.options.map((option) => option.toJSON().name).join(', ')}\``
							: `${command.data.description}`,
				};
			});
			const embed = new EmbedBuilder()
				.setColor(guildPrefs?.color ?? defaultPrefs.color)
				.setTitle('Commands')
				.setDescription(`Prefix: **${guildPrefs?.prefix ?? defaultPrefs?.prefix}**`)
				.addFields(fields);

			return await Bot.respond(command, { embeds: [embed] });
		} catch (error) {
			console.error(error);

			return await Bot.respond(command, '⚠️ | Could not display commands');
		}
	},
};
