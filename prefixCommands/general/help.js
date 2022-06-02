export default {
	name: "help",
	aliases: [],
	description: `Displays a list of all commands`,
	options: [],
	run: async (client, message) => {
		const MAX_FIELDS = 25;
		// Iterate over the commands and create field objects
		const fields = client.prefixCommands.map((command) => ({
			name: command.aliases.length
				? `${command.name} (${command.aliases.join(", ")})`
				: `${command.name}`,
			value: command.options.length
				? `${command.description}\nInput: ${command.options.join(", ")}`
				: `${command.description}`,
		}));

		// If there are less than 25 fields, you can safely send the embed in a single message
		if (fields.length <= MAX_FIELDS)
			return message.channel.send({
				embeds: [
					{
						title: "Commands",
						description: `Prefix: **${process.env.PREFIX}**`,
						fields,
						color: 0x5864f1,
					},
				],
			});

		function chunkify(arr, len) {
			const chunks = [];
			let i = 0;
			const n = arr.length;

			while (i < n) {
				chunks.push(arr.slice(i, (i += len)));
			}

			return chunks;
		}

		// If there are more, you need to create chunks w/ max 25 fields
		const chunks = chunkify(fields, MAX_FIELDS);
		// An array of embeds used by `discord.js-pagination`
		const pages = [];

		chunks.forEach(() => {
			// Create a new embed for each 25 fields
			pages.push({
				embeds: [
					{
						title: "Commands",
						description: `Prefix: **${process.env.PREFIX}**`,
						fields,
						color: 0x5864f1,
					},
				],
			});
        });
        
        return null;
	},
};
