import { App } from '#utils/app';
import { log } from '#utils/log';
import { Database } from '#utils/mongodb';
import { Events, type GuildMember } from 'discord.js';

// 10062: Unknown Interaction - fires when autocomplete expires before response, safe to ignore
const UNKNOWN_INTERACTION = 10062;

// Prefix commands
App.on(Events.MessageCreate, async (message) => {
	const guild = message.guild;
	const member = message.member;

	if (!message.author.bot && guild && member) {
		const preferences = Database.getPreferences({ userId: member.user.id, guildId: guild.id });

		if (message.content.toLowerCase().startsWith(preferences.prefix)) {
			const [input, ...args] = message.content.slice(preferences.prefix.length).trim().split(/ +/g);
			const prefixCommand =
				input &&
				(App.commands.get(input.toLowerCase()) ??
					App.commands.find((command) => command.aliases?.includes(input.toLowerCase())));

			if (prefixCommand) {
				try {
					await message.channel.sendTyping();

					await prefixCommand.execute({
						command: message,
						args,
						guild,
						member,
						preferences,
					});
				} catch (error) {
					log.error('[Commands] Prefix command error:', error);

					await App.respond({ command: message }, 'Something went wrong', { style: 'WARNING' });
				}
			}
		}
	}
});

// Slash commands
App.on(Events.InteractionCreate, async (interaction) => {
	const guild = interaction.guild;
	const member = interaction.member as GuildMember | null;

	if (guild && member) {
		const preferences = Database.getPreferences({ userId: member.user.id, guildId: guild.id });

		if (interaction.isAutocomplete()) {
			const slashCommand = App.commands.get(interaction.commandName);

			if (slashCommand?.autocomplete) {
				try {
					await slashCommand.autocomplete({ command: interaction, args: [], guild, member, preferences });
				} catch (error) {
					if (!(error instanceof Error && 'code' in error && error.code === UNKNOWN_INTERACTION)) {
						log.error('[Commands] Autocomplete error:', error);
					}
				}
			}
		} else if (interaction.isChatInputCommand()) {
			const slashCommand = App.commands.get(interaction.commandName);

			if (slashCommand) {
				try {
					await interaction.deferReply();

					await slashCommand.execute({ command: interaction, args: [], guild, member, preferences });
				} catch (error) {
					log.error('[Commands] Slash command error:', error);

					await App.respond({ command: interaction }, 'Something went wrong', { style: 'WARNING' });
				}
			}
		}
	}
});
