import { globby } from "globby";
import { prefixCommands, slashCommands } from "./index.js";

export default async () => {
	// Event handler
	const eventFiles: string[] = await globby("./events/**/*.js", { cwd: "./dist/" });

	eventFiles.forEach((value) => import(value));

	// Prefix Command Handler
	const prefixCommandFiles: string[] = await globby("./commands/prefix/**/*.js", { cwd: "./dist/" });

	console.log(prefixCommandFiles);

	prefixCommandFiles.forEach(async (value) => {
		const { default: prefixCommand } = await import(value);
		const splitted = value.split("/");
		const directory = splitted[splitted.length - 2];

		if (prefixCommand.name) {
			const properties = { directory, ...prefixCommand };

			prefixCommands.set(prefixCommand.name, properties);
		}
	});

	// Slash Command Handler
	const slashCommandFiles = await globby(".commands/slash/**/*.js", { cwd: "./dist/" });
	const slashCommandArray: any[] = [];

	slashCommandFiles.forEach(async (value) => {
		const { default: slashCommand } = await import(value);

		if (slashCommand.name) {
			slashCommands.set(slashCommand.name, slashCommand);

			if (["MESSAGE", "USER"].includes(slashCommand.type)) delete slashCommand.description;

			slashCommandArray.push(slashCommand);
		}
	});
};
