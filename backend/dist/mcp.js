import { Anthropic } from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";
import { getCroPriceInUsdc } from "./priceFeed.js";
dotenv.config();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
}
export class MCPClient {
    constructor() {
        this.transport = null;
        this.tools = [];
        this.localToolHandlers = {};
        this.anthropic = new Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });
        this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
        // ── Properly formatted tools with required input_schema ──
        this.tools = [
            {
                name: "price_get_cro",
                description: "Fetch the current price of CRO in USDC from CoinGecko",
                input_schema: {
                    type: "object",
                    properties: {},
                    required: [],
                },
            },
            {
                name: "trade_execute",
                description: "Execute a simulated trade between two tokens",
                input_schema: {
                    type: "object",
                    properties: {
                        side: {
                            type: "string",
                            enum: ["buy", "sell"],
                            description: "Whether to buy or sell",
                        },
                        amount: {
                            type: "number",
                            description: "Amount of the input token to trade",
                        },
                        tokenIn: {
                            type: "string",
                            description: "Symbol of the token being sold/spent",
                        },
                        tokenOut: {
                            type: "string",
                            description: "Symbol of the token being received",
                        },
                    },
                    required: ["side", "amount"],
                    additionalProperties: false,
                },
            },
            {
                name: "orderbook_get",
                description: "Get a snapshot of the current orderbook for a trading pair",
                input_schema: {
                    type: "object",
                    properties: {
                        pair: {
                            type: "string",
                            description: "Trading pair (e.g. 'CRO_USDC', 'ETH_USDT')",
                        },
                        depth: {
                            type: "integer",
                            description: "Number of price levels to return per side",
                            default: 10,
                        },
                    },
                    required: ["pair"],
                    additionalProperties: false,
                },
            },
        ];
        // Local tool implementations
        this.localToolHandlers["price_get_cro"] = async () => {
            try {
                const price = await getCroPriceInUsdc();
                return { content: JSON.stringify({ price, currency: "USDC", timestamp: new Date().toISOString() }) };
            }
            catch (err) {
                return { content: JSON.stringify({ error: "Failed to fetch price", details: String(err) }) };
            }
        };
        this.localToolHandlers["trade_execute"] = async (args = {}) => {
            const { side, amount, tokenIn = "?", tokenOut = "?" } = args;
            return {
                content: JSON.stringify({
                    status: "simulated",
                    message: `Simulated ${side?.toUpperCase() ?? "?"} order executed`,
                    detail: `${amount ?? "?"} ${tokenIn} → ${tokenOut}`,
                    timestamp: new Date().toISOString(),
                }),
            };
        };
        this.localToolHandlers["orderbook_get"] = async (args = {}) => {
            const pair = args.pair || "UNKNOWN";
            return {
                content: JSON.stringify({
                    pair,
                    timestamp: new Date().toISOString(),
                    bids: [],
                    asks: [],
                    note: "This is a simulated empty orderbook snapshot",
                }),
            };
        };
    }
    async connectToServer(serverScriptPath) {
        try {
            const isJs = serverScriptPath.endsWith(".js");
            const isPy = serverScriptPath.endsWith(".py");
            if (!isJs && !isPy) {
                throw new Error("Server script must be a .js or .py file");
            }
            const command = isPy
                ? process.platform === "win32" ? "python" : "python3"
                : process.execPath;
            this.transport = new StdioClientTransport({
                command,
                args: [serverScriptPath],
            });
            await this.mcp.connect(this.transport);
            const toolsResult = await this.mcp.listTools();
            // MCP → Anthropic format conversion
            this.tools = toolsResult.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema, // MCP uses camelCase, Anthropic wants snake_case
            }));
            console.log("Connected to MCP server with tools:", this.tools.map(({ name }) => name));
        }
        catch (e) {
            console.error("Failed to connect to MCP server:", e);
            throw e;
        }
    }
    async processQuery(query) {
        const messages = [
            {
                role: "assistant",
                content: "You are an AI assistant that can use tools to answer user queries. Use the available tools when needed to provide accurate and helpful responses. and use the tool once and do not loop on responses and hallucinate.",
            },
            {
                role: "user",
                content: query,
            },
        ];
        let finalText = [];
        // We'll loop until we get a final text response (no more tool calls)
        while (true) {
            const response = await this.anthropic.messages.create({
                model: "claude-sonnet-4-20250514", // ← update when newer model available
                max_tokens: 1200,
                messages,
                tools: this.tools.length > 0 ? this.tools : undefined,
            });
            // Collect text content
            for (const block of response.content) {
                if (block.type === "text") {
                    finalText.push(block.text);
                }
            }
            // Handle tool use
            // Use the imported ToolUseBlock type directly in the filtering logic.
            const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
            if (toolUseBlocks.length === 0) {
                // No more tool calls → final answer
                break;
            }
            for (const toolBlock of toolUseBlocks) {
                const toolName = toolBlock.name;
                const toolArgs = toolBlock.input;
                let result;
                if (this.localToolHandlers[toolName]) {
                    // Local handler
                    result = await this.localToolHandlers[toolName](toolArgs);
                    finalText.push(`[Local → ${toolName}(${JSON.stringify(toolArgs)})]`);
                }
                else {
                    // Remote MCP server tool
                    const mcpResult = await this.mcp.callTool({
                        name: toolName,
                        arguments: toolArgs,
                    });
                    // Extract text content from MCP result
                    const textContent = Array.isArray(mcpResult.content)
                        ? mcpResult.content
                            .filter((block) => block.type === "text")
                            .map((block) => block.text)
                            .join("")
                        : "";
                    result = textContent || JSON.stringify(mcpResult);
                    finalText.push(`[MCP → ${toolName}(${JSON.stringify(toolArgs)})]`);
                }
                // Add tool result to conversation
                messages.push({
                    role: "user",
                    content: typeof result === "string" ? result : (result.content ?? JSON.stringify(result)),
                });
            }
        }
        return finalText.join("\n\n");
    }
    async chatLoop() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        console.log("\nMCP Client Started!");
        console.log("Type your queries or 'quit' to exit.\n");
        try {
            while (true) {
                const message = await rl.question("Query: ");
                if (message.trim().toLowerCase() === "quit") {
                    break;
                }
                if (!message.trim())
                    continue;
                console.log("\nThinking...");
                const response = await this.processQuery(message);
                console.log("\n" + response + "\n");
            }
        }
        finally {
            rl.close();
        }
    }
    async cleanup() {
        if (this.transport) {
            await this.mcp.close();
        }
    }
}
