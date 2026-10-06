const express = require("express");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("."));

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Gemini request with automatic retry for temporary 503 errors
async function generateAIResponse(userMessage, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-3.8-flash",
                contents: userMessage
            });

            return response.text;

        } catch (error) {
            console.error(`Gemini attempt ${attempt} failed:`, error);

            // 503 = Gemini temporarily unavailable
            // Retry after 2 seconds
            if (error.status === 503 && attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }

            // 429 = quota exceeded
            // DO NOT retry
            throw error;
        }
    }
}

app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.message;

        if (!userMessage || !userMessage.trim()) {
            return res.status(400).json({
                reply: "Please enter a message."
            });
        }

        const reply = await generateAIResponse(userMessage);

        res.json({
            reply: reply
        });

    } catch (error) {
        console.error("Final error:", error);

        // Daily/API quota exceeded
        if (error.status === 429) {
            return res.status(429).json({
                reply: "⚠️ Today's Gemini API limit has been reached. Please try again after the quota resets."
            });
        }

        // Gemini temporarily busy
        if (error.status === 503) {
            return res.status(503).json({
                reply: "⚠️ Gemini is temporarily busy. Please try again in a few seconds."
            });
        }

        // Other errors
        res.status(500).json({
            reply: "⚠️ Something went wrong. Please try again."
        });
    }
});

app.listen(3000, () => {
    console.log("AI Chatbot is running at http://localhost:3000");
});
