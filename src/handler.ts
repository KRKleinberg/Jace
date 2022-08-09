import { globby } from 'globby';
import { prefixCommands, slashCommands } from "./index.js";

export default async () => {
	// Event handler
	const eventFiles = await globby("./**");

	console.log(eventFiles);

	// import("./events/ready.js");

	// eventFiles.forEach((value) => {
	//	import(value);
	//	console.log(value);
	// });

	// Prefix Command Handler
	const prefixCommandFiles: string[] = await globby(`./commands/prefix/**/*.js`);

	console.log(prefixCommandFiles);

	prefixCommandFiles.map(async (value) => {
		const { default: prefixCommand } = await import(value);
		const splitted = value.split("/");
		const directory = splitted[splitted.length - 2];

		if (prefixCommand.name) {
			const properties = { directory, ...prefixCommand };

			prefixCommands.set(prefixCommand.name, properties);
		}
	});

	// Slash Command Handler
	const slashCommandFiles = await globby(`./commands/slash/**/*.js`);
	const slashCommandArray: any[] = [];

	slashCommandFiles.map(async (value) => {
		const { default: slashCommand } = await import(value);

		if (slashCommand.name) {
			slashCommands.set(slashCommand.name, slashCommand);

			if (["MESSAGE", "USER"].includes(slashCommand.type)) delete slashCommand.description;

			slashCommandArray.push(slashCommand);
		}
	});
};
