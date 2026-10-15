import "dotenv/config";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


const response  = await groq.chat.completions.create({
    model:"openai/gpt-oss-120b",
    messages:[
        {role: "system", content:"You are a helpful assistant. Answer briefly."},
        {role:"user", content:"What is an AI agent ? Answer in one sentence."},
    ],
    temperature:0.2,
});

console.log(response.choices[0]?.message.content);
console.log(response.usage);