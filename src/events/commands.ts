import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { Events, type Client, type GuildMember } from 'discord.js';

export default {
	async execute(client) {
		// Prefix Commands
		client.on(Events.MessageCreate, async (message) => {
			if (!message.author.bot && message.guild != null && message.member != null) {
				const defaultPrefs = await (async (): Promise<Client['dynamoDBTableDefaultPrefs']> => {
					const getCommand = new GetCommand({
						TableName: process.env.DYNAMODB_TABLE_DEFAULTS,
						Key: {
							env: process.env.ENV,
						},
					});

					const response = await client.dynamoDBDocumentClient.send(getCommand);
					return Object(response.Item);
				})();
				const guildPrefs = await (async (): Promise<Client['dynamoDBTableGuildPrefs']> => {
					try {
						const getCommand = new GetCommand({
							TableName: process.env.DYNAMODB_TABLE_GUILDPREFS,
							Key: {
								guildId: message.guild?.id,
								env: process.env.ENV,
							},
						});

						const response = await client.dynamoDBDocumentClient.send(getCommand);
						return Object(response.Item);
					} catch (error) {
						return null;
					}
				})();
				const userPrefs = await (async (): Promise<Client['dynamoDBTableUserPrefs']> => {
					try {
						const getCommand = new GetCommand({
							TableName: process.env.DYNAMODB_TABLE_USERPREFS,
							Key: {
								userId: message.author.id,
								env: process.env.ENV,
							},
						});

						const response = await message.client.dynamoDBDocumentClient.send(getCommand);
						return Object(response.Item);
					} catch (error) {
						return null;
					}
				})();

				const prefix = guildPrefs?.prefix ?? defaultPrefs.prefix;

				if (defaultPrefs == null) throw new Error('DynamoDB default preferences not defined!');

				if (message.content.toLowerCase().startsWith(prefix)) {
					const [input, ...args] = message.content.slice(prefix.length).trim().split(/ +/g);
					const prefixCommand =
						client.commands.get(input?.toLowerCase()) ??
						client.commands.find((command) => command.aliases?.includes(input?.toLowerCase()));

					if (prefixCommand != null) {
						await message?.channel.sendTyping();

						try {
							await prefixCommand.execute({
								command: message,
								guild: message.guild,
								member: message.member,
								args,
								defaultPrefs,
								guildPrefs,
								userPrefs,
							});
						} catch (error) {
							console.error(error);

							await message?.channel.send('⚠️ | Something went wrong');
						}
					}
				}
			}
		});

		// Slash Commands
		client.on(Events.InteractionCreate, async (interaction) => {
			const defaultPrefs = await (async (): Promise<Client['dynamoDBTableDefaultPrefs']> => {
				const getCommand = new GetCommand({
					TableName: process.env.DYNAMODB_TABLE_DEFAULTS,
					Key: {
						env: process.env.ENV,
					},
				});

				const response = await client.dynamoDBDocumentClient.send(getCommand);
				return Object(response.Item);
			})();
			const guildPrefs = await (async (): Promise<Client['dynamoDBTableGuildPrefs']> => {
				try {
					const getCommand = new GetCommand({
						TableName: process.env.DYNAMODB_TABLE_GUILDPREFS,
						Key: {
							guildId: interaction.guild?.id,
							env: process.env.ENV,
						},
					});

					const response = await client.dynamoDBDocumentClient.send(getCommand);
					return Object(response.Item);
				} catch (error) {
					return null;
				}
			})();
			const userPrefs = await (async (): Promise<Client['dynamoDBTableUserPrefs']> => {
				try {
					const getCommand = new GetCommand({
						TableName: process.env.DYNAMODB_TABLE_USERPREFS,
						Key: {
							userId: interaction.user.id,
							env: process.env.ENV,
						},
					});

					const response = await interaction.client.dynamoDBDocumentClient.send(getCommand);
					return Object(response.Item);
				} catch (error) {
					return null;
				}
			})();

			if (defaultPrefs == null) throw new Error('DynamoDB default preferences not defined!');

			if (interaction.guild != null && interaction.member != null) {
				if (interaction.isAutocomplete()) {
					const slashCommand = client.commands.get(interaction.commandName);

					if (slashCommand?.autocomplete != null) {
						try {
							await slashCommand.autocomplete(interaction, userPrefs);
						} catch (error) {
							console.error(error);
						}
					}
				} else if (interaction.isChatInputCommand()) {
					const slashCommand = client.commands.get(interaction.commandName);

					if (slashCommand != null) {
						await interaction.deferReply();

						try {
							await slashCommand.execute({
								command: interaction,
								guild: interaction.guild,
								member: interaction.member as GuildMember,
								args: [],
								defaultPrefs,
								guildPrefs,
								userPrefs,
							});
						} catch (error) {
							console.error(error);

							await interaction.followUp({
								content: '⚠️ | Something went wrong',
								ephemeral: true,
							});
						}
					}
				}
			}
		});
	},
} satisfies Client['event'];
