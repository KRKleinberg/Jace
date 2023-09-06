import { EmbedBuilder, InteractionType, SlashCommandBuilder, type Client } from 'discord.js';

export default {
	aliases: ['h'],
	data: new SlashCommandBuilder().setDescription('Displays a list of commands'),
	async execute({ command, defaultPrefs, guildPrefs }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const fields = command.client.commands.map((command) => {
			return {
				name: command.aliases?.length != null ? `${command.data.name} (${command.aliases.join(', ')})` : `${command.data.name}`,
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

		const response = { embeds: [embed] };
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
} satisfies Client['command'];
