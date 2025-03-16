import { App } from '#utils/app';
import {
	ApplicationCommandOptionType,
	EmbedBuilder,
	SlashCommandBuilder,
	type APIEmbedField,
} from 'discord.js';

export const command: App.Command = {
	aliases: ['h'],
	data: new SlashCommandBuilder().setDescription('Displays a list of commands'),
	async run(ctx) {
		try {
			const fields: APIEmbedField[] = App.commands.map((command) => {
				const optionNames = command.data.options.flatMap((commandOption) => {
					const option = commandOption.toJSON();

					if (
						option.type !== ApplicationCommandOptionType.Subcommand &&
						option.type !== ApplicationCommandOptionType.SubcommandGroup
					) {
						return [`\`${option.name}\``];
					}

					return [];
				});

				return {
					name: command.aliases?.length
						? `${command.data.name} (${command.aliases.join(', ')})`
						: command.data.name,
					value: optionNames.length
						? `${command.data.description}\nInput: ${optionNames.join(', ')}\n${command.help ?? ''}`
						: `${command.data.description}\n${command.help ?? ''}`,
				};
			});
			const embed = new EmbedBuilder()
				.setColor(ctx.command.guild?.members.me?.displayHexColor ?? null)
				.setTitle('Commands')
				.setDescription(`Prefix: **${ctx.preferences.prefix}**`)
				.addFields(fields);

			return await App.respond(ctx, { embeds: [embed] });
		} catch (error) {
			console.error('Help Command Error -', error);

			return await App.respond(ctx, 'Could not display commands', App.ResponseType.AppError);
		}
	},
};
