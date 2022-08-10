import { ActivityType, REST, Routes } from 'discord.js';
import { client, slashCommandArray } from '../index.js';

client.once('ready', async () => {
	console.log(slashCommandArray);
	const rest = new REST({ version: '10' }).setToken(process.env.DJS_TOKEN!);
	await rest
		.put(Routes.applicationCommands(process.env.APP_ID!), { body: slashCommandArray })
		.then(() => console.log('Successfully registered application commands.'))
		.catch(console.error);

	client.user!.setPresence({
		activities: [{ name: `Frogger | ${process.env.PREFIX}help`, type: ActivityType.Playing }],
		status: 'online',
	});
	console.log(`${client.user!.tag} is online! Prefix set as "${process.env.PREFIX}"`);
});
