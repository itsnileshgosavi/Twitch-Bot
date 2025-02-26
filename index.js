import ComfyJS from "comfy.js";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const channels = ["profprotonn", "ruchess27", "azizana", "thewildlatina", "dramaqueen_555", "tinapalooza", "beaststatsofficial"]; // Add multiple channels here

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
    ComfyJS.Init(process.env.BOT_USERNAME, token, channels);

    ComfyJS.onChat = async (user, message, flags, self, extra) => {
        if (self) return;
    
        console.log(`Received message from ${user} in ${extra.channel}: ${message}`);
    
        if (message.toLowerCase().startsWith("bot,")) {
            const question = message.replace(/^bot,/, "").trim();
            const response = await askGemini(question);
    
            // Ensure the bot replies in the correct channel
            ComfyJS.Say(`@${user}, ${response.substring(0, 400)}`, extra.channel);
        }
    };
       

    console.log("Bot is running...");
}

// Auto-refresh token every 3.5 hours
setInterval(async () => {
    const newToken = await refreshAccessToken();
    if (newToken) {
        ComfyJS.Init(process.env.BOT_USERNAME, newToken, channels);
        console.log("Bot re-authenticated with new token");
    }
}, 3.5 * 60 * 60 * 1000);

async function askGemini(question) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(`respond to the following question/query in less than 500 characters and do not use markdown: ${question}`);
    return result.response.text();
}

startBot();



