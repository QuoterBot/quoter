/*
Copyright (C) 2020-2021 Nicholas Christopher

This file is part of Quoter.

Quoter is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, version 3.

Quoter is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with Quoter.  If not, see <https://www.gnu.org/licenses/>.
*/

const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const Guild = require("../schemas/guild.js");

const mentionParse = require("../util/mentionParse.js");

const { maxGuildQuotes, maxQuoteLength } = require("../config.json");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("newquote")
		.setDescription("Creates a new quote.")
		.addStringOption((o) =>
			o
				.setName("text")
				.setDescription("The quote's text.")
				.setRequired(true)
		)
		.addStringOption((o) =>
			o.setName("author").setDescription("The quote's author.")
		),
	cooldown: 10,
	guildOnly: true,
	async execute(interaction) {
		const guild = await Guild.findOneAndUpdate(
			{ _id: interaction.guild.id },
			{},
			{ upsert: true, new: true }
		);

		if (
			guild.allQuote ||
			interaction.member.permissions.has("MANAGE_GUILD") ||
			interaction.client.admins.includes(interaction.user.id)
		) {
			const serverQuotes = guild.quotes;

			if (
				serverQuotes.length >=
				(guild.maxGuildQuotes || maxGuildQuotes || 75)
			) {
				return await interaction.reply({
					content:
						"❌ **|** This server has too many quotes! Use `/deletequote` before creating more.",
					ephemeral: true,
				});
			}

			let author = interaction.options.getString("author");
			author &&= await mentionParse(author);

			const text = interaction.options.getString("text");

			if (text.length > (guild.maxQuoteLength || maxQuoteLength || 130)) {
				return await interaction.reply({
					content: `❌ **|** Quotes cannot be longer than ${
						guild.maxQuoteLength || maxQuoteLength || 130
					} characters.`,
					ephemeral: true,
				});
			}

			await serverQuotes.push({
				text,
				author,
				quoterID: interaction.user.id,
			});

			await guild.save();

			const successEmbed = new MessageEmbed()
				.setTitle("✅ Added quote")
				.setColor("GREEN")
				.setDescription(
					`Created a new server quote:

"${text}"${author ? ` - ${author}` : ""}`
				)
				.setFooter(`Quote #${serverQuotes.length}`);
			await interaction.reply({ embeds: [successEmbed] });
		} else {
			await interaction.reply({
				content: `✋ **|** That action requires the **Manage Guild** permission.

**❗ To allow anyone to create quotes**, have an admin use \`/allquote\`.`,
				ephemeral: true,
			});
		}
	},
};
