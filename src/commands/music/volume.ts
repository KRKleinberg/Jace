import { App } from '#utils/app';
import { collection } from '#utils/data';
import { Player } from '#utils/player';
import { useQueue } from 'discord-player';
import { InteractionType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	aliases: ['vol'],
	data: new SlashCommandBuilder()
		.setDescription('Displays or sets the volume for the server')
		.addIntegerOption((option) =>
			option
				.setName('volume')
				.setDescription('The volume to set between 5% and 100%')
				.setMinValue(5)
				.setMaxValue(100)
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async run(ctx) {
		const queue = useQueue();
		const volume =
			ctx.command.type === InteractionType.ApplicationCommand
				? ctx.command.options.getInteger('volume')
				: parseInt(ctx.args[0]) < 5
					? 5
					: parseInt(ctx.args[0]) > 100
						? 100
						: parseInt(ctx.args[0]);

		if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
			return await App.respond(
				ctx,
				'Only an administrator can execute this command',
				App.ResponseType.UserError
			);
		}
		if (!volume) {
			if (queue?.node.volume) {
				return await App.respond(
					ctx,
					`${Player.convertVolume(queue.node.volume, 'readable') < 50 ? '🔉' : '🔊'}\u2002Volume set to _${Player.convertVolume(queue.node.volume, 'readable').toString()}%_`
				);
			} else {
				return await App.respond(ctx, 'Could not display volume', App.ResponseType.AppError);
			}
		}

		try {
			if (queue) {
				queue.node.setVolume(Player.convertVolume(volume, 'queue'));
			}
		} catch (error) {
			console.error('Queue Set Volume Error:', error);

			return await App.respond(ctx, 'Could not set volume', App.ResponseType.AppError);
		}

		try {
			await collection.updateOne(
				{ discordId: ctx.guild.id },
				{ $set: { preferences: { volume } } },
				{ upsert: true }
			);
		} catch (error) {
			console.error('Database Update Error:', error);
		}

		return await App.respond(
			ctx,
			`${volume < 50 ? '🔉' : '🔊'}\u2002Volume set to _${volume.toString()}%_`
		);
	},
};
