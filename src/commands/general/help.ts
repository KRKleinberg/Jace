import { App } from '#utils/app';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	aliases: ['h'],
	data: new SlashCommandBuilder().setDescription('Displays a list of commands'),
	async run(ctx) {
		try {
			const fields = App.commands.map((command) => {
				return {
					name: command.aliases?.length
						? `${command.data.name} (${command.aliases.join(', ')})`
						: command.data.name,
					value: command.data.options.length
						? `${command.data.description}\nInput: \`${command.data.options.map((option) => option.toJSON().name).join(', ')}\`\n${command.help ?? ''}`
						: `${command.data.description}\n${command.help ?? ''}`,
				};
			});
			const embed = new EmbedBuilder()
				.setColor(ctx.preferences.color)
				.setTitle('Commands')
				.setDescription(`Prefix: **${ctx.preferences.prefix}**`)
				.addFields(fields);

			return await App.respond(ctx, { embeds: [embed] });
		} catch (error) {
			console.error('Help Command Error:', error);

			return await App.respond(ctx, 'Could not display commands', App.ResponseType.AppError);
		}
	},
};
