import { Events, GuildMember } from 'discord.js';
import { client, commands } from '../index.js';

// Prefix Commands
client.on(Events.MessageCreate, async (message) => {
	if (!process.env.PREFIX) throw new Error('PREFIX is not set!');

	if (
		!message.author.bot &&
		message.guild &&
		message.member &&
		message.content.toLowerCase().startsWith(process.env.PREFIX)
	) {
		const [input, ...args] = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
		const prefixCommand =
			commands.get(input?.toLowerCase()) || commands.find((command) => command.aliases?.includes(input?.toLowerCase()));

		if (prefixCommand) {
			await message?.channel.sendTyping();

			try {
				await prefixCommand.execute(message, message.guild, message.member, args);
			} catch (error) {
				console.error(error);

				await message?.channel.send('⚠️ | Something went wrong');
			}
		}
	}
});

// Slash Commands
client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.guild && interaction.member) {
		if (interaction.isAutocomplete()) {
			const slashCommand = commands.get(interaction.commandName);

			if (slashCommand) {
				try {
					await slashCommand.autocomplete(interaction);
				} catch (error) {
					console.error(error);
				}
			}
		} else if (interaction.isChatInputCommand()) {
			const slashCommand = commands.get(interaction.commandName);

			if (slashCommand) {
				await interaction.deferReply();

				try {
					await slashCommand.execute(interaction, interaction.guild, interaction.member as GuildMember);
				} catch (error) {
					console.error(error);

					await interaction.followUp({
						content: '⚠️ | Something went wrong',
						ephemeral: true,
					});
				}
			}
		}
	}
});
