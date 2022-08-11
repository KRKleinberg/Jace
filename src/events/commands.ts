import { Interaction, Message } from 'discord.js';
import { client, prefixCommands, slashCommands } from '../index.js';

client.on('messageCreate', async (message: Message) => {
	if (
		!message.author.bot &&
		message.guild &&
		message.content.toLowerCase().startsWith(process.env.PREFIX!)
	) {
		const [input, ...args] = message.content.slice(process.env.PREFIX!.length).trim().split(/ +/g);

		const prefixCommand =
			prefixCommands.get(input.toLowerCase()) ||
			prefixCommands.find((c) => c.aliases?.includes(input.toLowerCase()));

		if (prefixCommand) await prefixCommand.execute(message, args);
	}
});

client.on('interactionCreate', async (interaction: Interaction) => {
	// Slash Command Handling
	if (interaction.isChatInputCommand()) {
		const slashCommand = slashCommands.get(interaction.commandName);

		if (slashCommand) {
			try {
				await slashCommand.execute(interaction);
			} catch (error) {
				console.error(error);
				await interaction.reply({
					content: '⚠️ | There was an error while executing this command',
					ephemeral: true,
				});
			}
		}
	}
});
