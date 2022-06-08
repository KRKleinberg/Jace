export default {
	name: "help",
	aliases: [],
	description: `Displays a list of all prefixCommands`,
	options: [],
	run: async (client, message) => {
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

		message.channel.send({
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
