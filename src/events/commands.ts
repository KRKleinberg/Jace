import { App, type CommandContext, type ResponseOptions } from '#utils/app';
import { buildEmbed } from '#utils/embeds';
import { log } from '#utils/log';
import { Database } from '#utils/mongodb';
import {
	ApplicationCommandOptionType,
	Events,
	Guild,
	type APIApplicationCommandSubcommandOption,
	type BaseMessageOptions,
	type GuildMember,
} from 'discord.js';

// 10062: Unknown Interaction - fires when autocomplete expires before response, safe to ignore
const UNKNOWN_INTERACTION = 10062;

function buildPayload(
	guild: Guild,
	message: string | BaseMessageOptions,
	options?: ResponseOptions,
): BaseMessageOptions {
	if (typeof message !== 'string') return message;

	const { type = 'DEFAULT', emoji } = options ?? {};

	return {
		embeds: [
			buildEmbed(message, {
				color: guild.members.me?.displayHexColor ?? null,
				...(emoji && { emoji }),
				type,
			}),
		],
	};
}

// Prefix commands
App.on(Events.MessageCreate, async (message): Promise<void> => {
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

					const commandData = prefixCommand.data.toJSON();
					const subcommandNames =
						commandData.options
							?.filter((option) => option.type === ApplicationCommandOptionType.Subcommand)
							.map((option) => option.name) ?? [];
					let subcommand: string | null = null;

					if (subcommandNames?.length) {
						if (args[0] && subcommandNames.includes(args[0].toLowerCase())) {
							subcommand = args.shift()!.toLowerCase();
						} else {
							subcommand = subcommandNames[0]!;
						}
					}

					const sub = commandData.options?.find((option) => option.name === subcommand) as
						| APIApplicationCommandSubcommandOption
						| undefined;
					const optionNames = subcommand
						? (sub?.options?.map((option) => option.name) ?? [])
						: (commandData.options?.map((option) => option.name) ?? []);
					const ctx: CommandContext = {
						guild,
						member,
						preferences,
						source: message,
						getOption: (name) => {
							const index = optionNames.indexOf(name);

							if (index < 0) return null;

							if (index === optionNames.length - 1) {
								return args.slice(index).join(' ') || null;
							}

							return args[index] ?? null;
						},
						getSubcommand: () => subcommand,
						respond: async (msg, options) => {
							return await message.channel.send(buildPayload(guild, msg, options));
						},
					};

					await prefixCommand.execute(ctx);
				} catch (error) {
					log.error('[Commands] Prefix command error:', error);

					try {
						await message.channel.send(buildPayload(guild, 'Something went wrong', { type: 'APP_ERROR' }));
					} catch {
						// Log already sent
					}
				}
			}
		}
	}
});

// Slash commands
App.on(Events.InteractionCreate, async (interaction): Promise<void> => {
	const guild = interaction.guild;
	const member = interaction.member as GuildMember | null;

	if (guild && member) {
		const preferences = Database.getPreferences({ userId: member.user.id, guildId: guild.id });

		if (interaction.isAutocomplete()) {
			const slashCommand = App.commands.get(interaction.commandName);

			if (slashCommand?.autocomplete) {
				try {
					await slashCommand.autocomplete({ guild, member, preferences, source: interaction });
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

					const ctx: CommandContext = {
						guild,
						member,
						preferences,
						source: interaction,
						getOption: (name) => {
							const raw = interaction.options.get(name);
							return raw?.value?.toString() ?? null;
						},
						getSubcommand: () => {
							try {
								return interaction.options.getSubcommand();
							} catch {
								return null;
							}
						},
						respond: async (msg, options) => {
							const response = buildPayload(guild, msg, options);

							if (!interaction.replied) {
								return await interaction.editReply(response);
							} else {
								return await interaction.followUp(response);
							}
						},
					};

					await slashCommand.execute(ctx);
				} catch (error) {
					log.error('[Commands] Slash command error:', error);

					try {
						const response = buildPayload(guild, 'Something went wrong', {
							type: 'APP_ERROR',
						});

						if (!interaction.replied) {
							await interaction.editReply(response);
						} else {
							await interaction.followUp(response);
						}
					} catch {
						// Log already sent
					}
				}
			}
		}
	}
});
