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

app.post("/chat", async (req, res) => {
    try {
        const userMessage = req.body.message;

        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: userMessage
        });

        res.json({
            reply: response.text
        });

    } catch (error) {
    console.error(error);

    if (error.status === 503) {
        res.status(503).json({
            reply: "Gemini is currently busy. Please try again in a few seconds."
        });
    } else {
        res.status(500).json({
            reply: "Something went wrong. Please try again."
        });
    }
}
});

app.listen(3000, () => {
    console.log("AI Chatbot is running at http://localhost:3000");
});