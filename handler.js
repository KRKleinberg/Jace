import globPKG from "glob";
import { promisify } from "util";
const { glob } = globPKG;
const globPromise = promisify(glob);

export default async (client) => {
	const prefixCommandFiles = await globPromise(`${process.cwd()}/prefixCommands/**/*.js`);
	prefixCommandFiles.map(async (value) => {
		const { prefixCommand } = await import(value);
		const splitted = value.split("/");
		const directory = splitted[splitted.length - 2];

		if (prefixCommand.name) {
			const properties = { directory, ...prefixCommand };
			client.prefixCommands.set(prefixCommand.name, properties);
			console.log(prefixCommand.name);
		}
	});

	const eventFiles = await globPromise(`${process.cwd()}/events/**/*.js`);
	eventFiles.map((value) => import(value));

	const slashCommands = await globPromise(`${process.cwd()}/slashCommands/**/*.js`);

	const arrayOfSlashCommands = [];
	slashCommands.map(async (value) => {
		const { slashCommand } = await import(value);
		if (!slashCommand?.name) return;
		client.slashCommands.set(slashCommand.name, slashCommand);

		if (["MESSAGE", "USER"].includes(slashCommand.type)) delete slashCommand.description;
		arrayOfSlashCommands.push(slashCommand);
	});

	client.on("ready", async () => {
		//Test Server
		await client.guilds.cache.get("844223765302345749").commands.set(arrayOfSlashCommands);
		//All servers
		await client.application.commands.set(arrayOfSlashCommands);
	});

	// Comment out the line below for main branch
	setTimeout(function () {
		process.exit(0);
	}, 300000);
};
