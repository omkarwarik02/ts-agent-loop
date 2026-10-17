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

export type ToolResult =
  | { ok: true; output: string }
  | { ok: false; error: string };

export async function runTool<TInput>(
  tool: Tool<TInput>,
  rawArgs: string,
): Promise<ToolResult> {
  let json: unknown;
  try {
    json = JSON.parse(rawArgs);
  } catch {
    return { ok: false, error: `Invalid JSON for ${tool.name}: ${rawArgs}` };
  }
  const parsed = tool.schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid arguments for ${tool.name}: ${z.prettifyError(parsed.error)}`,
    };
  }

  try {
    const output = await tool.execute(parsed.data);
    return { ok: true, output };
  } catch (err) {
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
  timezone: z
    .string()
    .describe(
      "IANA timezone name, for example 'Asia/Kolkata' or 'America/New_York'",
    ),
});

type GetTimeInput = z.infer<typeof GetTimeInput>;

export const getTimeTool: Tool<GetTimeInput> = {
  name: "get_time",
  description: "Get the current date and time in a given timezone.",
  schema: GetTimeInput,
  execute: async ({ timezone }) =>
    new Date().toLocaleString("en-IN", { timeZone: timezone }),
};

const WebSearchInput = z.object({
  query: z
    .string()
    .describe(
      "A short web search query, like 'latest React version release notes'",
    ),
});

type WebSearchInput = z.infer<typeof WebSearchInput>;

export const WebSearchTool: Tool<WebSearchInput> = {
  name: "web_search",
  description:
    "Search the web for up-to-date information.Returns titles, URLS and short snippets.",
  schema: WebSearchInput,
  execute: async ({ query }) => {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, max_results: 3 }),
    });

    if (!res.ok) {
      throw new Error(`Tavily error ${res.status}:${await res.text()}`);
    }

    const data = (await res.json()) as {
      results: { title: string; url: string; content: string[] }[];
    };
    return data.results
      .map((r, i) => `${i + 1}. ${r.title}\n${r.url}\n${r.content}`)
      .join("\n\n");
  },
};


const fetchPageInput = z.object({
    url:z.url().describe("Full URL of the page to read, usually taken from web_search results"),
});

type FetchPageInput = z.infer<typeof fetchPageInput>;

const MAX_PAGE_CHARS = 4000;

export const fetchPageTool: Tool<FetchPageInput> = {
    name:"fetch_page",
    description:"Read the main text of a web page. Use it on a URl from web_search when the snippet is not detailed enough.",
    schema: fetchPageInput,
    execute:async({ url }) => {
        const res = await fetch(url, {
            headers:{"User-Agent": "Mozilla/5.0 (agent-from-scratch-ts)"},
            signal:AbortSignal.timeout(10_000),
        });
        if(!res.ok){
            throw new Error(`HTTP ${res.status} for ${url}`);
        }

        const html = await res.text();

        const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

      return text.length > MAX_PAGE_CHARS ? text.slice(0, MAX_PAGE_CHARS) + "...[truncated]" : text;
    }
}













export const allTools: Tool<any>[] = [addTool, getTimeTool, WebSearchTool,fetchPageTool];

export function findTool(name: string) {
  return allTools.find((t) => t.name === name);
}

export function toGroqTool(tool: Tool<any>) {
  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.schema),
    },
  };
}
