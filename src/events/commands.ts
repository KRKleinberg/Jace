import * as Bot from '@utils/bot';
import * as DynamoDB from '@utils/dynamodb';
import { Events, type GuildMember } from 'discord.js';

export const event: Bot.Event = {
	async execute() {
		// Prefix Commands
		Bot.client.on(Events.MessageCreate, (message) => {
			void (async () => {
				if (!message.author.bot && message.guild != null && message.member != null) {
					const defaultPrefs = await DynamoDB.getDefaultPrefs();
					const guildPrefs = await DynamoDB.getGuildPrefs(message.guild);
					const userPrefs = await DynamoDB.getUserPrefs(message.author);
					const prefix = guildPrefs?.prefix ?? defaultPrefs.prefix;

					if (defaultPrefs == null) throw new Error('DynamoDB default preferences not defined!');

					if (message.content.toLowerCase().startsWith(prefix)) {
						const [input, ...args] = message.content.slice(prefix.length).trim().split(/ +/g);
						const prefixCommand =
							Bot.commands.get(input?.toLowerCase()) ??
							Bot.commands.find((command) => command.aliases?.includes(input?.toLowerCase()));

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
			})();
		});

		// Slash Commands
		Bot.client.on(Events.InteractionCreate, (interaction) => {
			void (async () => {
				if (interaction.guild != null) {
					const defaultPrefs = await DynamoDB.getDefaultPrefs();
					const guildPrefs = await DynamoDB.getGuildPrefs(interaction.guild);
					const userPrefs = await DynamoDB.getUserPrefs(interaction.user);

					if (defaultPrefs == null) throw new Error('DynamoDB default preferences not defined!');

					if (interaction.guild != null && interaction.member != null) {
						if (interaction.isAutocomplete()) {
							const slashCommand = Bot.commands.get(interaction.commandName);

							if (slashCommand?.autocomplete != null)
								try {
									await slashCommand.autocomplete(interaction, userPrefs);
								} catch (error) {
									console.error(error);
								}
						} else if (interaction.isChatInputCommand()) {
							const slashCommand = Bot.commands.get(interaction.commandName);

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
				}
			})();
		});
	},
};
