import { Interaction } from 'discord.js';
import { client, slashCommands } from '../../index.js';

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
