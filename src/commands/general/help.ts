import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	Guild,
	GuildMember,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';
import { commands } from '../../index.js';

export default {
	aliases: [''],
	data: new SlashCommandBuilder().setDescription('Displays a list of commands'),
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const fields = commands.map((command) => {
			return {
				name: command.aliases?.length ? `${command.data.name} (${command.aliases.join(', ')})` : `${command.data.name}`,
				value: command.data.options.length
					? `${command.data.description}
				Input: \`${command.data.options.map((option) => option.toJSON().name).join(', ')}\``
					: `${command.data.description}`,
			};
		});
		const embed = new EmbedBuilder()
			.setColor('#5864f1')
			.setTitle('Commands')
			.setDescription(`Prefix: **${process.env.PREFIX}**`)
			.addFields(fields);

		const response = { embeds: [embed] };
		return isInteraction ? command.editReply(response) : command.channel.send(response);
	},
};
