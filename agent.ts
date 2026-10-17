import "dotenv/config";
import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { allTools, findTool, runTool, toGroqTool, type ToolResult } from "./tools.js";

const MODEL ="openai/gpt-oss-120b";
const MAX_STEPS = 8;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY})


async function runAgent(question:string):Promise<string> {

    const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: "You are a helpful assistant. Use tools when you need real-time information." },
    { role: "user", content: question },
    ];

    let step = 0;

    while(step < MAX_STEPS){
        step++;
        console.log(`\n---- steps ${step}----`);

        const response = await groq.chat.completions.create({
            model:MODEL,
            messages,
            tools:allTools.map(toGroqTool),
            tool_choice:"auto",
        });

        const msg = response.choices[0]?.message;
        if(!msg) throw new Error("No response from model");

        const toolCalls = msg.tool_calls ?? [];


        if(toolCalls.length === 0){
            return msg.content ?? ""
        }

        messages.push({
            role:"assistant",
            content:msg.content ?? "",
            tool_calls: toolCalls
        });


        for(const call of toolCalls){
            const tool = findTool(call.function.name);


            const result: ToolResult = tool ? await runTool(tool, call.function.arguments) : {ok:false, error:`Unkown tool:${call.function.name}`};

            console.log(`🔧 ${call.function.name}(${call.function.arguments}) →`, result);

            messages.push({
                role:"tool",
                tool_call_id: call.id,
                content: result.ok ? result.output :  `Error:${result.error}`,
            })
        }
    }
    return `Stopped after ${MAX_STEPS} steps without a final answer.`
}

const answer = await runAgent("What time is it in Mumbai and in New York?");
console.log("\n🤖", answer);