import { Anthropic } from "@anthropic-ai/sdk";
import {
  MessageParam,
  Tool,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";
import { getCroPriceInUsdc } from "./priceFeed.js";

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

export class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  private localToolHandlers: Record<
    string,
    (args?: any) => Promise<string>
  > = {};

  constructor() {
    this.anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });

    this.tools = [
      {
        name: "price_get_cro",
        description: "Fetch the current price of CRO in USDC",
        input_schema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "trade_execute",
        description: "Execute a simulated trade",
        input_schema: {
          type: "object",
          properties: {
            side: { type: "string", enum: ["buy", "sell"] },
            amount: { type: "number" },
            tokenIn: { type: "string" },
            tokenOut: { type: "string" },
          },
          required: ["side", "amount"],
        },
      },
    ];

    // Local tool handlers
    this.localToolHandlers["price_get_cro"] = async () => {
      const price = await getCroPriceInUsdc();
      return JSON.stringify({ price, currency: "USDC" });
    };

    this.localToolHandlers["trade_execute"] = async (args = {}) => {
      return JSON.stringify({
        status: "simulated",
        ...args,
      });
    };
  }

  async connectToServer(serverScriptPath: string) {
    const command = serverScriptPath.endsWith(".py")
      ? process.platform === "win32" ? "python" : "python3"
      : process.execPath;

    this.transport = new StdioClientTransport({
      command,
      args: [serverScriptPath],
    });

    await this.mcp.connect(this.transport);

    const toolsResult = await this.mcp.listTools();
    this.tools = toolsResult.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    console.log("Connected MCP tools:", this.tools.map(t => t.name));
  }

  async processQuery(query: string) {
    const messages: MessageParam[] = [
      { role: "user", content: query },
    ];

    while (true) {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        system:
          "You are an AI trading assistant. Use tools when needed. Call each tool at most once.",
        messages,
        tools: this.tools,
      });

      messages.push({
        role: "assistant",
        content: response.content,
      });

      const toolUses = response.content.filter(
        (b): b is ToolUseBlock => b.type === "tool_use"
      );

      if (toolUses.length === 0) break;

      for (const tool of toolUses) {
        const handler = this.localToolHandlers[tool.name];
        const result = handler
          ? await handler(tool.input)
          : JSON.stringify(
              await this.mcp.callTool({
                name: tool.name,
                arguments: tool.input as { [x: string]: unknown } | undefined,
              })
            );

        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: tool.id,
              content: result,
            },
          ],
        });
      }
    }

    return messages
      .flatMap((m) =>
        Array.isArray(m.content)
          ? m.content.filter((c: any) => c.type === "text").map((c: any) => c.text)
          : []
      )
      .join("\n");
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("MCP Client Ready (type 'quit' to exit)");

    while (true) {
      const q = await rl.question("> ");
      if (q === "quit") break;
      console.log(await this.processQuery(q));
    }

    rl.close();
  }
}
