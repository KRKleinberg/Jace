import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';

export default {
	data: new SlashCommandBuilder()
		.setName('ai')
		.setDescription('An AI that responds to your messages')
		.addStringOption((option) =>
			option.setName('prompt').setDescription('The prompt for the AI').setRequired(true)
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_KEY }));

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

		return interaction.reply(
			(await ask(interaction.options.getString('prompt')!)) || '❌ | No response from AI'
		);
	},
};
