import { ActivityType, REST, Routes } from 'discord.js';
import { client, commandData } from '../index.js';

client.once('ready', async () => {
	const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN as string);

	await rest
		.put(Routes.applicationCommands(process.env.DISCORD_APP_ID as string), { body: commandData })
		.catch(console.error);

	client.user?.setPresence({
		status: 'online',
		activities: [
			{
				name: `Frogger | ${process.env.PREFIX}help`,
				type: ActivityType.Playing,
			},
		],
	});

	console.log(`${client.user?.tag} is online! Prefix set as "${process.env.PREFIX}"`);
});
