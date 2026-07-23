const http = require("http");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

require("dotenv").config();

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("License Bot is running");
});

server.listen(PORT, () => {
  console.log(`HTTP server on port ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

const CONFIG = {
  token: process.env.DISCORD_TOKEN,
  scriptUrl: process.env.GOOGLE_SCRIPT_URL,
  allowedRoleId: process.env.ALLOWED_ROLE_ID,
};

function hasPermission(member) {
  if (!CONFIG.allowedRoleId) return member.permissions.has("Administrator");
  return (
    member.permissions.has("Administrator") ||
    member.roles.cache.has(CONFIG.allowedRoleId)
  );
}

async function apiRequest(method, body) {
  const res = await fetch(CONFIG.scriptUrl, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  // ============================================
  // !add userid/placeid/groupid
  // ============================================
  if (command === "add") {
    if (!hasPermission(message.member)) {
      return message.reply("No permission.");
    }

    const input = args[0];
    if (!input) {
      return message.reply(
        "Usage: `!add userid/placeid/groupid`\nMinimal 1 field harus diisi, gunakan `-` untuk field kosong.\nContoh:\n`!add 12345/67890/-`\n`!add -/-/99999`\n`!add 12345/-/-`"
      );
    }

    const parts = input.split("/");
    const userid = parts[0] === "-" ? "" : (parts[0] || "");
    const placeid = parts[1] === "-" ? "" : (parts[1] || "");
    const groupid = parts[2] === "-" ? "" : (parts[2] || "");

    if (!userid && !placeid && !groupid) {
      return message.reply("Minimal 1 field harus diisi.");
    }

    try {
      const result = await apiRequest("POST", {
        action: "add",
        userid,
        placeid,
        groupid,
      });

      if (result.success) {
        const fields = [];
        if (userid) fields.push({ name: "User ID", value: userid, inline: true });
        if (placeid) fields.push({ name: "Place ID", value: placeid, inline: true });
        if (groupid) fields.push({ name: "Group ID", value: groupid, inline: true });
        fields.push({ name: "Status", value: "Lifetime", inline: true });

        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle("License Added")
          .addFields(fields)
          .setTimestamp();

        message.reply({ embeds: [embed] });
      } else {
        message.reply(`Error: ${result.error}`);
      }
    } catch (err) {
      message.reply("API request failed.");
    }
  }

  // ============================================
  // !check placeid
  // ============================================
  if (command === "check") {
    if (!hasPermission(message.member)) {
      return message.reply("No permission.");
    }

    const placeid = args[0];
    if (!placeid) {
      return message.reply("Usage: `!check <placeId>`");
    }

    try {
      const res = await fetch(
        `${CONFIG.scriptUrl}?action=check&placeid=${placeid}`
      );
      const result = await res.json();

      if (result.valid) {
        const d = result.data;
        const fields = [
          { name: "Place ID", value: d.placeid || "-", inline: true },
          { name: "Status", value: d.status || "-", inline: true },
        ];
        if (d.userid) fields.push({ name: "User ID", value: d.userid, inline: true });
        if (d.groupid) fields.push({ name: "Group ID", value: d.groupid, inline: true });

        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle("License Valid")
          .addFields(fields)
          .setTimestamp();

        message.reply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("License Invalid")
          .addFields({ name: "Place ID", value: placeid, inline: true })
          .setTimestamp();

        message.reply({ embeds: [embed] });
      }
    } catch (err) {
      message.reply("API request failed.");
    }
  }

  // ============================================
  // !revoke placeid
  // ============================================
  if (command === "revoke") {
    if (!hasPermission(message.member)) {
      return message.reply("No permission.");
    }

    const placeid = args[0];
    if (!placeid) {
      return message.reply("Usage: `!revoke <placeId>`");
    }

    try {
      const result = await apiRequest("POST", {
        action: "revoke",
        placeid,
      });

      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("License Revoked")
          .addFields({ name: "Place ID", value: placeid, inline: true })
          .setTimestamp();

        message.reply({ embeds: [embed] });
      } else {
        message.reply(`Error: ${result.error}`);
      }
    } catch (err) {
      message.reply("API request failed.");
    }
  }
});

client.login(CONFIG.token);
