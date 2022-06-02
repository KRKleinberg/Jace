import client from "../../index";

client.on("interactionCreate", async (interaction) => {
	// Slash Command Handling
	if (interaction.isCommand()) {
		await interaction.deferReply({ ephemeral: false }).catch(() => {});

		const slashCommand = client.slashCommands.get(interaction.commandName);
		if (!slashCommand) return interaction.followUp({ content: "An error has occured" });

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
		/* for (let option of interaction.options.data) {
			if (option.type === "SUB_COMMAND") {
				if (option.name) args.push(option.name);
				option.options.forEach((x) => {
					if (x.value) args.push(x.value);
				});
			} else if (option.value) args.push(option.value);
		} */

		// interaction.member = interaction.guild.members.cache.get(interaction.user.id);

		slashCommand.run(client, interaction, args);
	}

	// Context Menu Handling
	if (interaction.isContextMenu()) {
		await interaction.deferReply({ ephemeral: false });
		const slashCommand = client.slashCommands.get(interaction.commandName);
		if (slashCommand) slashCommand.run(client, interaction);
	}

	return null;
});
