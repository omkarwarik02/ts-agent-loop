
import { z } from "zod";        // ✅ use this

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

export const addTool: Tool<AddInput> = {
  name: "add",
  description: "Add tow number and return the sum",
  schema: AddInput,
  execute: async ({ a, b }) => String(a + b),
};

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

console.log(await runTool(addTool, '{"a": 2, "b": 3}'));
console.log(await runTool(addTool, '{"a": "2"}'));
console.log(await runTool(addTool, "not json"));

