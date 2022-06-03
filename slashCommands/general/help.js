export default {
	name: "help",
	description: `Displays a list of all commands`,
	run: async (client, interaction) => {
		// Iterate over the commands and create field objects
		// If there are less than 25 fields, you can safely send the embed in a single message
		const fields = client.commands.map((command) => ({
			name: command.aliases.length
				? `${command.name} (${command.aliases.join(", ")})`
				: `${command.name}`,
			value: `${command.description}`,
		}));
		// .slice(0, 25);

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
