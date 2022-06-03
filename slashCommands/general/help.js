export default {
	name: "help",
	description: `Displays a list of all commands`,
	run: async (client, interaction) => {
		const MAX_FIELDS = 25;
		// Iterate over the commands and create field objects
		const fields = client.prefixCommands
			.map((command) => ({
				name: command.aliases.length
					? `${command.name} (${command.aliases.join(", ")})`
					: `${command.name}`,
				value: command.options.length
					? `${command.description}\nInput: ${command.options.join(", ")}`
					: `${command.description}`,
			}))
			.slice(0, 25);

		// If there are less than 25 fields, you can safely send the embed in a single message
		if (fields.length <= MAX_FIELDS)
			interaction.followUp({
				embeds: [
					{
						title: "Commands",
						description: `Prefix: **${process.env.PREFIX}**`,
						fields,
						color: 0x5864f1,
					},
				],
			});
	},
};
