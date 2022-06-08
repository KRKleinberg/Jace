import client from "../../index.js";

client.on("interactionCreate", async (interaction) => {
	// Slash Command Handling
	if (interaction.isCommand()) {
		await interaction.followUp({ ephemeral: false }).catch(() => {});

		const slashCommand = client.slashCommands.get(interaction.commandName);
		if (slashCommand) {
			const args = [];

			const options = interaction.options.data;
			options.map((option) => {
				if (option.type === "SUB_COMMAND") {
					if (option.name) args.push(option.name);
					option.options.forEach((x) => {
						if (x.value) args.push(x.value);
					});
				} else if (option.value) args.push(option.value);
				return null;
			});

			slashCommand.run(client, interaction, args);
		} else interaction.followUp({ content: "An error has occured" });
	}

	// Context Menu Handling
	if (interaction.isContextMenu()) {
		await interaction.followUp({ ephemeral: false });

		const slashCommand = client.slashCommands.get(interaction.commandName);

		if (slashCommand) slashCommand.run(client, interaction);
	}
});
