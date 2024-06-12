import * as App from '@utils/app';
import { Events, type GuildMember } from 'discord.js';

export const event: App.Event = {
	async execute() {
		// Prefix Commands
		App.client.on(Events.MessageCreate, (message) => {
			void (async () => {
				if (!message.author.bot && message.guild != null && message.member != null) {
					const user = message.member;
					const guild = message.guild;
					const preferences = await App.getPreferences({ userId: user.id, guildId: guild.id });

					if (message.content.toLowerCase().startsWith(preferences.prefix)) {
						const [input, ...args] = message.content.slice(preferences.prefix.length).trim().split(/ +/g);
						const prefixCommand =
							App.commands.get(input?.toLowerCase()) ??
							App.commands.find((command) => command.aliases?.includes(input?.toLowerCase()));

						if (prefixCommand != null) {
							await message?.channel.sendTyping();

							try {
								await prefixCommand.execute({
									command: message,
									guild: message.guild,
									member: message.member,
									args,
									preferences,
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
		App.client.on(Events.InteractionCreate, (interaction) => {
			void (async () => {
				if (interaction.guild != null) {
					const preferences = await App.getPreferences({
						userId: interaction.user.id,
						guildId: interaction.guild.id,
					});

					if (interaction.guild != null && interaction.member != null) {
						if (interaction.isAutocomplete()) {
							const slashCommand = App.commands.get(interaction.commandName);

							if (slashCommand?.autocomplete != null)
								try {
									await slashCommand.autocomplete(interaction, preferences);
								} catch (error) {
									console.error(error);
								}
						} else if (interaction.isChatInputCommand()) {
							const slashCommand = App.commands.get(interaction.commandName);

							if (slashCommand != null) {
								await interaction.deferReply();

								try {
									await slashCommand.execute({
										command: interaction,
										guild: interaction.guild,
										member: interaction.member as GuildMember,
										args: [],
										preferences,
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
