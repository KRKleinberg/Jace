export default {
	name: "help",
	aliases: [],
	description: `Displays a list of all commands`,
	options: [],
	run: async (client, message) => {
		// Iterate over the commands and create field objects
		// If there are less than 25 fields, you can safely send the embed in a single message
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
