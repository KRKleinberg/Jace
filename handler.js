import globPKG from "glob";
import { promisify } from "util";

const { glob } = globPKG;
const globPromise = promisify(glob);

export default async (client) => {
	// Event Handler
	const eventFiles = await globPromise(`${process.cwd()}/events/**/*.js`);
	eventFiles.map((value) => import(value));

	// Prefix Command Handler
	const prefixCommandFiles = await globPromise(`${process.cwd()}/prefixCommands/**/*.js`);
	prefixCommandFiles.map(async (value) => {
		const { default: prefixCommand } = await import(value);
		const splitted = value.split("/");
		const directory = splitted[splitted.length - 2];

		if (prefixCommand.name) {
			const properties = { directory, ...prefixCommand };
			client.prefixCommands.set(prefixCommand.name, properties);
		}
	});

	// Slash Command Handler
	const slashCommands = await globPromise(`${process.cwd()}/slashCommands/**/*.js`);
	const arrayOfSlashCommands = [];
	slashCommands.map(async (value) => {
		const { default: slashCommand } = await import(value);
		if (slashCommand?.name) {
			client.slashCommands.set(slashCommand.name, slashCommand);

			if (["MESSAGE", "USER"].includes(slashCommand.type)) delete slashCommand.description;
			arrayOfSlashCommands.push(slashCommand);
		}
	});
	client.on("ready", async () => {
		await client.application.commands.set(arrayOfSlashCommands);
	});

	// Comment out the line below for main branch
	setTimeout(() => {
		process.exit(0);
	}, 300000);
};
