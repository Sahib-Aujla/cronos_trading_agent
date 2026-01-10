import { Anthropic } from "@anthropic-ai/sdk";
import {
    MessageParam,
    Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";
import { getCroPriceInUsdc } from "./priceFeed";

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
}

class MCPClient {
    private mcp: Client;
    private anthropic: Anthropic;
    private transport: StdioClientTransport | null = null;
    private tools: Tool[] = [];
    private localToolHandlers: Record<string, (args?: any) => Promise<{ content: string } | string>> = {};

    constructor() {
        this.anthropic = new Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });
        this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });

        // Register local tools so the model can call them without a remote MCP server
        this.tools.push({
            name: "price.get_cro",
            description: "Fetch current CRO price in USD (local)",
        } as unknown as Tool);

        this.tools.push({
            name: "trade.execute",
            description: "Execute a trade (simulated local handler)",
        } as unknown as Tool);

        this.tools.push({
            name: "orderbook.get",
            description: "Return orderbook snapshot (local stub)",
        } as unknown as Tool);

        this.localToolHandlers["price.get_cro"] = async () => {
            const price = await getCroPriceInUsdc();
            return { content: JSON.stringify({ price }) };
        };

        this.localToolHandlers["trade.execute"] = async (args?: any) => {
            const body = args ?? {};
            return {
                content: JSON.stringify({
                    status: "simulated",
                    detail: `Simulated ${body.side ?? "?"} ${body.amount ?? 0} ${body.tokenIn ?? ""} -> ${body.tokenOut ?? ""}`,
                }),
            };
        };

        this.localToolHandlers["orderbook.get"] = async (args?: any) => {
            const pair = (args && (args.pair || args.pairName)) ?? "unknown";
            return { content: JSON.stringify({ pair, bids: [], asks: [] }) };
        };
    }
    // methods will go here
    async connectToServer(serverScriptPath: string) {
        try {
            const isJs = serverScriptPath.endsWith(".js");
            const isPy = serverScriptPath.endsWith(".py");
            if (!isJs && !isPy) {
                throw new Error("Server script must be a .js or .py file");
            }
            const command = isPy
                ? process.platform === "win32"
                    ? "python"
                    : "python3"
                : process.execPath;

            this.transport = new StdioClientTransport({
                command,
                args: [serverScriptPath],
            });
            await this.mcp.connect(this.transport);

            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools.map((tool) => {
                return {
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.inputSchema,
                };
            });
            console.log(
                "Connected to server with tools:",
                this.tools.map(({ name }) => name)
            );
        } catch (e) {
            console.log("Failed to connect to MCP server: ", e);
            throw e;
        }
    }
    async processQuery(query: string) {
        const messages: MessageParam[] = [
            {
                role: "user",
                content: query,
            },
        ];

        const response = await this.anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages,
            tools: this.tools,
        });

        const finalText = [];

        for (const content of response.content) {
            if (content.type === "text") {
                finalText.push(content.text);
            } else if (content.type === "tool_use") {
                const toolName = content.name;
                const toolArgs = content.input as { [x: string]: unknown } | undefined;

                // If we have a local handler for the tool, call it directly
                if (this.localToolHandlers[toolName]) {
                    const result = await this.localToolHandlers[toolName](toolArgs);
                    finalText.push(
                        `[Local tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
                    );

                    messages.push({
                        role: "user",
                        content: typeof result === "string" ? result : (result.content ?? JSON.stringify(result)),
                    });

                    const followupResponse = await this.anthropic.messages.create({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 1000,
                        messages,
                    });

                    finalText.push(
                        followupResponse.content[0].type === "text" ? followupResponse.content[0].text : ""
                    );
                } else {
                    const result = await this.mcp.callTool({
                        name: toolName,
                        arguments: toolArgs,
                    });
                    finalText.push(
                        `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
                    );

                    messages.push({
                        role: "user",
                        content: result.content as string,
                    });

                    const followupResponse = await this.anthropic.messages.create({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 1000,
                        messages,
                    });

                    finalText.push(
                        followupResponse.content[0].type === "text" ? followupResponse.content[0].text : ""
                    );
                }
            }
        }

        return finalText.join("\n");
    }
    async chatLoop() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        try {
            console.log("\nMCP Client Started!");
            console.log("Type your queries or 'quit' to exit.");

            while (true) {
                const message = await rl.question("\nQuery: ");
                if (message.toLowerCase() === "quit") {
                    break;
                }
                const response = await this.processQuery(message);
                console.log("\n" + response);
            }
        } finally {
            rl.close();
        }
    }

    async cleanup() {
        await this.mcp.close();
    }
}