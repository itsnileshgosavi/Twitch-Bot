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
        command: "!hello",
        response:'Hello There!'
    },
    {
        command: "!now",
        response:'Now watching some movie that I dont like'
    },
    {
        command: "!movie",
        response:'Now watching some movie that I dont like'
    },
    {
        command:'!about',
        response:"I am human"
    },
    {
        command:'!help',
        response:"Yaha kisiko kuch help nahi milti.."
    },
    {
        command:'!contact',
        response:"LOL"
    },
    {
        command:'!support',
        response:"bhak bsdk"
    },
    {
        command:'!subscribe',
        response:'sub to my channel'
    },
    {
        command:'!discord',
        response:'discord link is in the profile. thik se dekh bhai'
    },
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
    const channels =await axios.get("https://67cc4505dd7651e464eb7b28.mockapi.io/bot/channels")
    const usernames =channels.data.map(channel => channel.channelId);
    console.log(usernames)
    ComfyJS.Init(process.env.BOT_USERNAME, token, usernames);

    ComfyJS.onChat = async (user, message, flags, self, extra) => {
        if (self) return;
    
        if (message.toLowerCase().startsWith("ai,") && user.toLowerCase()==="profprotonn") {
            const question = message.replace(/^ai,/, "").trim();
            const response = await askGemini(question);
    
            // Ensure the bot replies in the correct channel
            ComfyJS.Say(`@${user}, ${response.substring(0, 400)}`, extra.channel);
        }

        for (const command of commnadList) {
            if (message.toLowerCase().startsWith(command.command)) {
                const response = command.response;
                ComfyJS.Say(`@${user}, ${response.substring(0, 400)}`, extra.channel);
            }
        }
    };
       

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



