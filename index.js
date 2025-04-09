import ComfyJS from "comfy.js";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import express from "express";
import cors from "cors";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const commnadList = [
    {
        command: "hello",
        response:'Hello There!'
    },
    {
        command: "now",
        response:'Now watching some movie that I dont like'
    },
    {
        command: "movie",
        response:'Now watching some movie that I dont like'
    },
    {
        command:'about',
        response:"I am human"
    },
    {
        command:'help',
        response:"Yaha kisiko kuch help nahi milti.."
    },
    {
        command:'contact',
        response:"LOL"
    },
    {
        command:'support',
        response:"bhak bsdk"
    },
    {
        command:'follow',
        response:'Sablog Follow karlo fatak se behenchod'
    },
    {
        command:'discord',
        response:'discord link is in the profile. thik se dekh bhai'
    },
];

// Add moderation commands
const moderationCommands = [
    {
        command: "timeout",
        requiresMod: true,
        execute: async (user, message, extra) => {
            const parts = message.split(" ");
            if (parts.length < 3) {
                return `@${user}, Usage: !timeout [username] [seconds]`;
            }
            const targetUser = parts[1];
            const duration = parseInt(parts[2]);
            if (isNaN(duration) || duration < 1 || duration > 600) {
                return `@${user}, Timeout duration must be between 1 and 600 seconds`;
            }
            try {
                await axios.post(`https://api.twitch.tv/helix/moderation/bans`, 
                    { user_id: extra.userId, broadcaster_id: extra.roomId, moderator_id: extra.userId, reason: "Timeout by moderator" },
                    { 
                        headers: { 
                            'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`,
                            'Client-Id': process.env.CLIENT_ID,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                return `@${targetUser} has been timed out for ${duration} seconds`;
            } catch (error) {
                console.error("Timeout error:", error);
                return `@${user}, Failed to timeout user`;
            }
        }
    },
    {
        command: "ban",
        requiresMod: true,
        execute: async (user, message, extra) => {
            const parts = message.split(" ");
            if (parts.length < 2) {
                return `@${user}, Usage: !ban [username]`;
            }
            const targetUser = parts[1];
            try {
                await axios.post(`https://api.twitch.tv/helix/moderation/bans`, 
                    { user_id: extra.userId, broadcaster_id: extra.roomId, moderator_id: extra.userId, reason: "Banned by moderator" },
                    { 
                        headers: { 
                            'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`,
                            'Client-Id': process.env.CLIENT_ID,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                return `@${targetUser} has been banned`;
            } catch (error) {
                console.error("Ban error:", error);
                return `@${user}, Failed to ban user`;
            }
        }
    },
    {
        command: "clear",
        requiresMod: true,
        execute: async (user, message, extra) => {
            try {
                await axios.delete(`https://api.twitch.tv/helix/moderation/chat`, 
                    { 
                        headers: { 
                            'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`,
                            'Client-Id': process.env.CLIENT_ID
                        },
                        params: {
                            broadcaster_id: extra.roomId,
                            moderator_id: extra.userId
                        }
                    }
                );
                return `Chat has been cleared`;
            } catch (error) {
                console.error("Clear chat error:", error);
                return `@${user}, Failed to clear chat`;
            }
        }
    },
    {
        command: "unban",
        requiresMod: true,
        execute: async (user, message, extra) => {
            const parts = message.split(" ");
            if (parts.length < 2) {
                return `@${user}, Usage: !unban [username]`;
            }
            const targetUser = parts[1];
            try {
                await axios.delete(`https://api.twitch.tv/helix/moderation/bans`, 
                    { 
                        headers: { 
                            'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`,
                            'Client-Id': process.env.CLIENT_ID
                        },
                        params: {
                            broadcaster_id: extra.roomId,
                            moderator_id: extra.userId,
                            user_id: targetUser
                        }
                    }
                );
                return `@${targetUser} has been unbanned`;
            } catch (error) {
                console.error("Unban error:", error);
                return `@${user}, Failed to unban user`;
            }
        }
    },
    {
        command: "mods",
        requiresMod: false,
        execute: async (user, message, extra) => {
            try {
                const response = await axios.get(`https://api.twitch.tv/helix/moderation/moderators`, 
                    { 
                        headers: { 
                            'Authorization': `Bearer ${process.env.OAUTH_TOKEN}`,
                            'Client-Id': process.env.CLIENT_ID
                        },
                        params: {
                            broadcaster_id: extra.roomId
                        }
                    }
                );
                const mods = response.data.data.map(mod => mod.user_name).join(", ");
                return `Moderators: ${mods}`;
            } catch (error) {
                console.error("Get mods error:", error);
                return `@${user}, Failed to get moderators`;
            }
        }
    }
];

const app = express();
//configure cors
app.use(cors())
app.use(express.json());

app.get("/restart/:password", async (req, res) => {
    if (req.params.password !== "Nilesh@123") {
        return res.status(401).send("Unauthorized");     
    }
    ComfyJS.Disconnect();
    startBot();
    res.sendStatus(200);   
}
)

app.listen(3000, "0.0.0.0", () => {
    console.log("Server is running on port 3000");
});

async function refreshAccessToken() {
    try {
        const response = await axios.post("https://id.twitch.tv/oauth2/token", null, {
            params: {
                client_id: process.env.CLIENT_ID,  // Twitch Client ID
                client_secret: process.env.CLIENT_SECRET,  // Twitch Client Secret
                refresh_token: process.env.REFRESH_TOKEN,  // Stored Refresh Token
                grant_type: "refresh_token",
            },
        });

        const { access_token, refresh_token } = response.data;
        console.log("New Access Token:", access_token);

        // Update environment variables (consider saving new refresh token in a database)
        process.env.OAUTH_TOKEN = access_token;
        process.env.REFRESH_TOKEN = refresh_token;

        return access_token;
    } catch (error) {
        console.error("Error refreshing token:", error.response?.data || error.message);
        return null;
    }
}

async function startBot() {
    const token = await refreshAccessToken() || process.env.OAUTH_TOKEN;
    const channels = await axios.get("https://67cc4505dd7651e464eb7b28.mockapi.io/bot/channels")
    const usernames = channels.data.map(channel => channel.channelId);
    console.log(usernames)
    ComfyJS.Init(process.env.BOT_USERNAME, token, usernames);

    ComfyJS.onChat = async (user, message, flags, self, extra) => {
        if (self) return;
    
        // Handle AI command
        if (message.toLowerCase().startsWith("ai,") && user.toLowerCase()==="profprotonn") {
            const question = message.replace(/^ai,/, "").trim();
            const response = await askGemini(question);
    
            // Ensure the bot replies in the correct channel
            ComfyJS.Say(`@${user}, ${response.substring(0, 400)}`, extra.channel);
            return;
        }

    };

    ComfyJS.onCommand = async (user, command, message, flags, extra) => {
        if (flags.broadcaster || flags.mod) {
            const moderationCommand = moderationCommands.find(cmd => cmd.command === command);
            if (moderationCommand) {
                if (moderationCommand.requiresMod && !flags.broadcaster) {
                    ComfyJS.Say(`@${user}, Only broadcaster can use this command`, extra.channel);
                    return;
                }
                const response = await moderationCommand.execute(user, message, extra);
                ComfyJS.Say(response, extra.channel);
                return;
            }
        }

        const commandObj = commnadList.find(cmd => cmd.command === command);
        if (commandObj) {
            ComfyJS.Say(`@${user} ${commandObj.response}`, extra.channel);
        }
    };

    ComfyJS.onCheer((user, message, extra) => {
        ComfyJS.Say(`@${user} Thanks for the ${extra.bits} bits!`, extra.channel);
    })

    ComfyJS.onRaid((user, viewers, extra) => {
        ComfyJS.Say(`@${user} Thanks for the raid of ${viewers}!`, extra.channel);
    })

    ComfyJS.onReward = ( user, reward, cost, message, extra ) => {
        ComfyJS.Say( user + " redeemed " + reward + " for " + cost );
      }

    ComfyJS.onSub = (user, message, extra) => {
        ComfyJS.Say(`@${user} Thanks for the sub!`, extra.channel);
    }
       
    console.log("Bot is running...");
}

// Auto-refresh token every 3.5 hours
setInterval(async () => {
    const channels =await axios.get("https://67cc4505dd7651e464eb7b28.mockapi.io/bot/channels")
    const usernames =channels.data.map(channel => channel.channelId);
    const newToken = await refreshAccessToken();
    if (newToken) {
        ComfyJS.Init(process.env.BOT_USERNAME, newToken, usernames);
        console.log("Bot re-authenticated with new token");
    }
}, 3.5 * 60 * 60 * 1000);

async function askGemini(question) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(`respond to the following question/query in less than 500 characters and do not use markdown: ${question}`);
    return result.response.text();
}

startBot();



