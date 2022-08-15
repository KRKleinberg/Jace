import { ActivityType, REST, Routes } from 'discord.js';
import { client, slashCommandArray } from '../index.js';

client.once('ready', async () => {
	const rest = new REST({ version: '10' }).setToken(process.env.DJS_TOKEN!);

	await rest
		.put(Routes.applicationCommands(process.env.APP_ID!), { body: slashCommandArray })
		.catch(console.error);

	client.user?.setActivity(`Frogger | ${process.env.PREFIX}help`, { type: ActivityType.Playing });
	client.user?.setStatus('online');

	console.log(`${client.user!.tag} is online! Prefix set as "${process.env.PREFIX}"`);
});
