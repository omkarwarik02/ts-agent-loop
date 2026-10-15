import "dotenv/config";
import Groq from "groq-sdk";
import { z } from "zod";
import { getTimeTool } from "./tool.js";

const MODEL = "openai/gpt-oss-120b";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const response = await groq.chat.completions.create({
  model: MODEL,
  messages: [
    { role: "system", content: "You are a helpful assistant. Use tools when you need real-time information." },
    { role: "user", content: "What time is it in Mumbai right now?" },
  ],
  tools: [
    {
      type: "function",
      function: {
        name: getTimeTool.name,
        description: getTimeTool.description,
        parameters: z.toJSONSchema(getTimeTool.schema),
      },
    },
  ],
  tool_choice: "auto",
  temperature: 0.2,
});

const choice = response.choices[0];
console.log("finish_reason:", choice?.finish_reason);
console.log(JSON.stringify(choice?.message, null, 2));