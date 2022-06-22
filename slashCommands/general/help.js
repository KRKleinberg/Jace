export default {
	name: "help",
	description: `Displays a list of all prefixCommands`,
	run: async (client, interaction) => {
		const fields = client.prefixCommands
			.map((prefixCommand) => ({
				name: prefixCommand.aliases.length
					? `${prefixCommand.name} (${prefixCommand.aliases.join(", ")})`
					: `${prefixCommand.name}`,
				value: prefixCommand.options.length
					? `${prefixCommand.description}\nInput: ${prefixCommand.options.join(", ")}`
					: `${prefixCommand.description}`,
			}))
			.slice(0, 25);

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
