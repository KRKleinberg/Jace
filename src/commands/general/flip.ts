import {
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';

export default {
	aliases: [''],
	data: new SlashCommandBuilder().setDescription('Flips a coin'),
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;

		const response = `🪙 | **${Math.round(Math.random()) ? 'Heads' : 'Tails'}**`;
		return isInteraction ? command.editReply(response) : command.channel.send(response);
	},
};
