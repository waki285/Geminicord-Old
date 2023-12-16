require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});
const { EmbedBuilder } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_PRO_KEY);

client.on("ready", () => {
  console.log(`${client.user.tag} has logged in.`);
});

/** @type {{ role: string, parts: string }[]} */
const conversations = [];

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel?.topic?.includes("Gemini")) {
    if (message.content.startsWith("#")) return;
    if (message.content.startsWith("clear")) {
      conversations.length = 0;
      message.reply("Clear!");
      return;
    }
    const content = message.cleanContent.trim();
    const msg = await message.reply("Generating...");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chat = await model.startChat({ history: conversations });
    const res = await chat.sendMessageStream(content);
    let text = "";
    let ended = false;
    (async () => {
      for await (const chunk of res.stream) {
        const chunkText = chunk.text();
        console.log(chunkText);
        text += chunkText;
      }
      ended = true;
    })();

    const to = setInterval(() => {
      msg.edit(text.slice(0, 1999));
    }, 3000);

    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (ended) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
    const embed = new EmbedBuilder()
      .setDescription("2000文字を超えるため、一部のみ表示しています。")
    msg.edit({ content: text.slice(0, 1999), embeds: [text.length > 1999 ? embed : []].flat() });
    clearInterval(to);
    conversations.push({ role: "user", parts: content });
    conversations.push({ role: "model", parts: text });
  }
});

void client.login(process.env.DISCORD_TOKEN);
