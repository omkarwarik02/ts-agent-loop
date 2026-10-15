import "dotenv/config";
import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { allTools, findTool, runTool, toGroqTool, type ToolResult } from "./tools.js";


const MODEL = "openai/gpt-oss-120b";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY});


const messages : ChatCompletionMessageParam[] = [
     { role: "system", content: "You are a helpful assistant. Use tools when you need real-time information." },
  { role: "user", content: "What time is it in Mumbai and in New York?" },
];

const first = await groq.chat.completions.create({
    model:MODEL,
    messages,
    tools:allTools.map(toGroqTool),
    tool_choice:"auto",
});


const assistantMsg = first.choices[0]?.message;
if(!assistantMsg) throw new Error("No respose from model");

const toolCalls = assistantMsg.tool_calls ?? [];



messages.push({
    role:"assistant",
    content: assistantMsg.content ?? "",
    tool_calls: toolCalls,
});


for (const call of toolCalls){
    const tool = findTool(call.function.name);

    const result : ToolResult = tool ? await runTool(tool, call.function.arguments) : {ok : false, error:`Unkown tool: ${call.function.name}`};

    console.log(`🔧 ${call.function.name}(${call.function.arguments}) →`, result);

    messages.push({
        role: "tool",
        tool_call_id: call.id,
        content:result.ok ? result.output : `Error: ${result.error}`,
    })
}

const second  = await groq.chat.completions.create({
    model:  MODEL,
    messages,
    tools:allTools.map(toGroqTool),
});
const secondMsg = second.choices[0];
console.log("finish_reason:", secondMsg?.finish_reason);
console.log(JSON.stringify(secondMsg?.message, null, 2))