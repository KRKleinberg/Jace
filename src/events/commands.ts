import { App } from '#utils/app';
import { Data } from '#utils/data';
import { Player } from '#utils/player';
import { Events, type GuildMember } from 'discord.js';

export const event: App.Event = {
	run() {
		// Prefix commands
		App.client.on(Events.MessageCreate, async (message) => {
			const guild = message.guild;
			const member = message.member;
			const preferences = await Data.getPreferences({ userId: member?.user.id, guildId: guild?.id });

			if (!message.author.bot && guild && member) {
				if (message.content.toLowerCase().startsWith(preferences.prefix)) {
					const [input, ...args] = message.content.slice(preferences.prefix.length).trim().split(/ +/g);
					const prefixCommand =
						App.commands.get(input.toLowerCase()) ??
						App.commands.find((command) => command.aliases?.includes(input.toLowerCase()));

					try {
						if (prefixCommand) {
							await message.channel.sendTyping();

							await Player.client.context.provide({ guild }, async () => {
								try {
									await prefixCommand.run({
										command: message,
										args,
										guild,
										member,
										preferences,
									});
								} catch (error) {
									console.error('Prefix Command Error -', error);

									await App.respond({ command: message }, 'Something went wrong', App.ResponseType.AppError);
								}
							});
						}
					} catch (error) {
						console.error('Prefix Command Error -', error);
					}
				}
			}
		});

		// Slash commands
		App.client.on(Events.InteractionCreate, async (interaction) => {
			const guild = interaction.guild;
			const member = interaction.member as GuildMember | null;

			if (guild && member) {
				if (interaction.isAutocomplete()) {
					const slashCommand = App.commands.get(interaction.commandName);

					if (slashCommand?.autocomplete) {
						try {
							await slashCommand.autocomplete({ command: interaction, args: [], guild, member });
						} catch (error) {
							if (!String(error).includes('DiscordAPIError[10062]: Unknown interaction')) {
								console.error('Autocomplete Error -', error);
							}
						}
					}
				} else if (interaction.isChatInputCommand()) {
					const slashCommand = App.commands.get(interaction.commandName);

					try {
						if (slashCommand) {
							await interaction.deferReply();

							await Player.client.context.provide({ guild }, async () => {
								try {
									const preferences = await Data.getPreferences({ userId: member.user.id, guildId: guild.id });

									await slashCommand.run({ command: interaction, args: [], guild, member, preferences });
								} catch (error) {
									console.error('Slash Command Error -', error);

									await App.respond({ command: interaction }, 'Something went wrong', App.ResponseType.AppError);
								}
							});
						}
					} catch (error) {
						console.error('Slash Command Error -', error);
					}
				}
			}
		});
	},
};
