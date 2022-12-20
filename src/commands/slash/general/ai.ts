import {
	ChatInputCommandInteraction,
	codeBlock,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import { openai } from '../../../index.js';

export default {
	data: new SlashCommandBuilder()
		.setName('ai')
		.setDescription('An AI that responds to your messages')
		.addStringOption((option) =>
			option.setName('prompt').setDescription('The prompt for the AI').setRequired(true)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const input = interaction.options.getString('prompt');

		async function ask(prompt: string) {
			const response = await openai.createCompletion({
				model: 'text-davinci-003',
				prompt,
				temperature: 0.7,
				max_tokens: 2048,
				top_p: 1,
				frequency_penalty: 0,
				presence_penalty: 0,
			});

			return response.data.choices[0].text;
		}

		interaction.deferReply();

		const embed = new EmbedBuilder()
			.setAuthor({
				name: `"${input}"`,
				iconURL: interaction.user.avatarURL() || interaction.user.defaultAvatarURL,
			})
			.setColor(0x5864f1)
			.setDescription(codeBlock((await ask(input!)) || 'No response'));

		return interaction.editReply({ embeds: [embed] });
	},
};
