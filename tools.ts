
import { z } from "zod";      

const AddInput = z.object({
  a: z.number().describe("first number"),
  b: z.number().describe("second number"),
});

type AddInput = z.infer<typeof AddInput>;

export interface Tool<TInput> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  execute: (input: TInput) => Promise<string>;
}


export type ToolResult = | {ok: true; output:string} | {ok:false; error: string};

export async function runTool<TInput>(
    tool: Tool<TInput>,
    rawArgs:string
): Promise<ToolResult>{
    let json: unknown;
    try{
        json = JSON.parse(rawArgs);
    } catch {
        return {ok: false, error: `Invalid JSON for ${tool.name}: ${rawArgs}`}
    }
const parsed = tool.schema.safeParse(json);
if(!parsed.success){
    return {
       ok: false,
      error: `Invalid arguments for ${tool.name}: ${z.prettifyError(parsed.error)}`,   
    }
}

try{
    const output = await tool.execute(parsed.data);
    return {ok:true, output} 

} catch(err){
    const message = err instanceof Error ? err.message : String(err);
     return { ok: false, error: `${tool.name} failed: ${message}` };
}

}








export const addTool: Tool<AddInput> = {
  name: "add",
  description: "Add two number and return the sum",
  schema: AddInput,
  execute: async ({ a, b }) => String(a + b),
};


const GetTimeInput = z.object({
    timezone: z.string().describe("IANA timezone name, for example 'Asia/Kolkata' or 'America/New_York'"),
});

type GetTimeInput = z.infer<typeof GetTimeInput>;

export const getTimeTool: Tool<GetTimeInput> = {
    name: "get_time",
    description: "Get the current date and time in a given timezone.",
    schema: GetTimeInput,
    execute: async ({ timezone}) => new Date().toLocaleString("en-IN",{ timeZone: timezone}),
};








export const allTools : Tool<any>[] = [addTool, getTimeTool];

export function findTool(name:string){
    return allTools.find((t) => t.name === name);
}

export function toGroqTool(tool: Tool<any>){
    return {
        type:"function" as const,
        function:{
            name:tool.name,
            description:tool.description,
            parameters: z.toJSONSchema(tool.schema),
        } 
    }
}





























