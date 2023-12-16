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
      const decoder = new TextDecoder();
      for await (const chunk of res.stream) {
        const chunkText = decoder.decode(Buffer.from(chunk.text()), { stream: true });
        text += chunkText;
      }
      text += decoder.decode();
      ended = true;
    })();

    const to = setInterval(() => {
      if (!text.length) return;
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
    if (text.length === 0) text = "No response. 規制にかかったかな？";
    msg.edit({ content: text.slice(0, 1999), embeds: [text.length > 1999 ? embed : []].flat() });
    clearInterval(to);
    conversations.push({ role: "user", parts: content });
    conversations.push({ role: "model", parts: text });
  }
});

void client.login(process.env.DISCORD_TOKEN);

process.on("uncaughtException", (err) => {
  console.error(err);
});