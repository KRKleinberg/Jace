import { CommandInteractionOption, CacheType } from "discord.js";
import { client, prefixCommands, slashCommands } from "../index.js";

client.on("messageCreate", async (message) => {
	if (
		!message.author.bot &&
		message.guild &&
		message.content.toLowerCase().startsWith(process.env.PREFIX!)
	) {
		const [input, ...args] = message.content.slice(process.env.PREFIX!.length).trim().split(/ +/g);

		const prefixCommand =
			prefixCommands.get(input.toLowerCase()) ||
			prefixCommands.find((c) => c.aliases?.includes(input.toLowerCase()));

		if (prefixCommand) await prefixCommand.run(client, message, args);
	}
});

client.on("interactionCreate", async (interaction) => {
	// Slash Command Handling
	if (interaction.isChatInputCommand()) {
		await interaction.followUp({ ephemeral: false }).catch(() => {});

		const slashCommand = slashCommands.get(interaction.commandName);

		if (slashCommand) {
			const args: any[] = [];
			const options: readonly CommandInteractionOption<CacheType>[] = interaction.options.data;

			options.forEach((option: any) => {
				if (option.type === "SUB_COMMAND") {
					if (option.name) args.push(option.name);

					option.options.forEach((x: any) => {
						if (x.value) args.push(x.value);
					});
				} else if (option.value) args.push(option.value);
			});

			slashCommand.run(client, interaction, args);
		} else interaction.followUp({ content: "An error has occured" });
	}
});
