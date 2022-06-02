import globPKG from "glob";
import { promisify } from "util";
const { glob } = globPKG;
const globPromise = promisify(glob);

export default async (client) => {
	const prefixCommandFiles = await globPromise(`${process.cwd()}/prefixCommands/**/*.js`);
	prefixCommandFiles.map(async (value) => {
		const file = await import(value);
		const splitted = value.split("/");
		const directory = splitted[splitted.length - 2];

		if (file.name) {
			const properties = { directory, ...file };
			client.prefixCommands.set(file.name, properties);
			console.log(file.name);
		}
	});

	const eventFiles = await globPromise(`${process.cwd()}/events/**/*.js`);
	eventFiles.map((value) => import(value));

	const slashCommands = await globPromise(`${process.cwd()}/slashCommands/**/*.js`);

	const arrayOfSlashCommands = [];
	slashCommands.map(async (value) => {
		const file = await import(value);
		if (!file?.name) return;
		client.slashCommands.set(file.name, file);

		if (["MESSAGE", "USER"].includes(file.type)) delete file.description;
		arrayOfSlashCommands.push(file);
	});

	client.on("ready", async () => {
		await client.application.commands.set(arrayOfSlashCommands);
	});

	// Comment out the line below for main branch
	setTimeout(function () {
		process.exit(0);
	}, 300000);
};
