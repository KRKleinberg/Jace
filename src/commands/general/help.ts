import type { Command } from '#utils/app';
import { App } from '#utils/app';
import { resolveEmbedColor } from '#utils/embeds';
import {
	ApplicationCommandOptionType,
	EmbedBuilder,
	SlashCommandBuilder,
	type APIEmbedField,
} from 'discord.js';

export const command: Command = {
	aliases: ['h'],
	data: new SlashCommandBuilder().setDescription('Displays a list of commands'),
	async execute(ctx) {
		const fields: APIEmbedField[] = App.commands.map((command) => {
			const json = command.data.toJSON();
			const hasSubcommands = json.options?.some(
				(opt) => opt.type === ApplicationCommandOptionType.Subcommand,
			);

			let usage = '';

			if (hasSubcommands) {
				const subs = json
					.options!.filter((opt) => opt.type === ApplicationCommandOptionType.Subcommand)
					.map((sub) => {
						const args =
							sub.options?.map((opt) => (opt.required ? `<${opt.name}>` : `[${opt.name}]`)).join(' ') ?? '';

						return `\`${ctx.preferences.prefix}${json.name} ${sub.name}${args ? ` ${args}` : ''}\``;
					});

				usage = subs.join('\n');
			} else {
				const args =
					json.options
						?.filter(
							(opt) =>
								opt.type !== ApplicationCommandOptionType.Subcommand &&
								opt.type !== ApplicationCommandOptionType.SubcommandGroup,
						)
						.map((opt) => (opt.required ? `<${opt.name}>` : `[${opt.name}]`))
						.join(' ') ?? '';

				usage = `\`${ctx.preferences.prefix}${json.name}${args ? ` ${args}` : ''}\``;
			}

			const name = command.aliases?.length ? `${json.name} (${command.aliases.join(', ')})` : json.name;

			return {
				name,
				value: `${json.description}\n${usage}`,
			};
		});

		const embed = new EmbedBuilder()
			.setColor(resolveEmbedColor(ctx.source.channelId))
			.setTitle('Commands')
			.setDescription(`Prefix: \`${ctx.preferences.prefix}\``)
			.addFields(fields);

		return await ctx.respond({ embeds: [embed] });
	},
};
