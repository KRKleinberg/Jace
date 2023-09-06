import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ActivityType, REST, Routes, type Client } from 'discord.js';

export default {
	async execute(client: Client) {
		client.once('ready', async () => {
			const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN as string);
			const defaultPrefix = await (async (): Promise<any> => {
				const getCommand = new GetCommand({
					TableName: process.env.DYNAMODB_TABLE_DEFAULTS,
					Key: {
						env: process.env.ENV,
					},
				});

				const response = await client.dynamoDBDocumentClient.send(getCommand);
				return response.Item?.prefix;
			})();

			try {
				await rest.put(Routes.applicationCommands(process.env.DISCORD_APP_ID as string), {
					body: client.commands.map((command) => command.data),
				});
			} catch (error) {
				console.error(error);
			}

			client.user?.setPresence({
				status: 'online',
				activities: [
					{
						name: `Frogger | ${defaultPrefix}help`,
						type: ActivityType.Playing,
					},
				],
			});

			console.log(`${client.user?.tag} is online! Prefix set as "${defaultPrefix}"`);
		});
	},
} satisfies Client['event'];
