require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});
const axios = require("axios");
const { JSONParser } = require("@streamparser/json");

client.on("ready", () => {
  console.log(`${client.user.tag} has logged in.`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel?.topic?.includes("Gemini")) {
    const content = message.content.trim();
    const msg = await message.reply("Generating...");
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${process.env.GEMINI_PRO_KEY}`,
      { contents: [{ parts: [{ text: content }] }] },
      {
        headers: {
          "Content-Type": "application/json",
        },
        responseType: "stream",
      }
    );
    const parser = new JSONParser();
    let text = "";
    parser.onValue = ({ value }) => {
      if (value.text) {
        text += value.text;
      }
    };

    res.data.on("data", (chunk) => {
      parser.write(chunk.toString());
    });

    const to = setInterval(() => {
      msg.edit(text);
    }, 3000);

    res.data.on("end", () => {
      msg.edit(text);
      clearInterval(to);
    });
  }
});

void client.login(process.env.DISCORD_TOKEN);
