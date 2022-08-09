import globPkg from "glob";
import { promisify } from "util";
import { prefixCommands, slashCommands } from "./index.js";

const { glob } = globPkg;
const globPromise = promisify(glob);

export default async () => {
	// Event handler
	const eventFiles: string[] = await globPromise(`${process.cwd()}/src/events/**/*.js`);

	eventFiles.forEach((value) => import(value));

	// Prefix Command Handler
	const prefixCommandFiles: string[] = await globPromise(
		`${process.cwd()}/src/commands/prefix/**/*.js`
	);

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
	const slashCommandFiles = await globPromise(`$process.cwd()}/src/commands/slash/**/*.js`);
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
