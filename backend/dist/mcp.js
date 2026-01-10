"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPClient = void 0;
const sdk_1 = require("@anthropic-ai/sdk");
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/client/stdio.js");
const promises_1 = __importDefault(require("readline/promises"));
const dotenv_1 = __importDefault(require("dotenv"));
const priceFeed_1 = require("./priceFeed");
dotenv_1.default.config();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
}
class MCPClient {
    constructor() {
        this.transport = null;
        this.tools = [];
        this.localToolHandlers = {};
        this.anthropic = new sdk_1.Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });
        this.mcp = new index_js_1.Client({ name: "mcp-client-cli", version: "1.0.0" });
        // Register local tools so the model can call them without a remote MCP server
        this.tools.push({
            name: "price_get_cro",
            description: "Fetch current CRO price in USD (local)",
        });
        this.tools.push({
            name: "trade_execute",
            description: "Execute a trade (simulated local handler)",
        });
        this.tools.push({
            name: "orderbook_get",
            description: "Return orderbook snapshot (local stub)",
        });
        this.localToolHandlers["price_get_cro"] = async () => {
            const price = await (0, priceFeed_1.getCroPriceInUsdc)();
            return { content: JSON.stringify({ price }) };
        };
        this.localToolHandlers["trade_execute"] = async (args) => {
            const body = args ?? {};
            return {
                content: JSON.stringify({
                    status: "simulated",
                    detail: `Simulated ${body.side ?? "?"} ${body.amount ?? 0} ${body.tokenIn ?? ""} -> ${body.tokenOut ?? ""}`,
                }),
            };
        };
        this.localToolHandlers["orderbook_get"] = async (args) => {
            const pair = (args && (args.pair || args.pairName)) ?? "unknown";
            return { content: JSON.stringify({ pair, bids: [], asks: [] }) };
        };
    }
    // methods will go here
    async connectToServer(serverScriptPath) {
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
            this.transport = new stdio_js_1.StdioClientTransport({
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
            console.log("Connected to server with tools:", this.tools.map(({ name }) => name));
        }
        catch (e) {
            console.log("Failed to connect to MCP server: ", e);
            throw e;
        }
    }
    async processQuery(query) {
        const messages = [
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
            }
            else if (content.type === "tool_use") {
                const toolName = content.name;
                const toolArgs = content.input;
                // If we have a local handler for the tool, call it directly
                if (this.localToolHandlers[toolName]) {
                    const result = await this.localToolHandlers[toolName](toolArgs);
                    finalText.push(`[Local tool ${toolName} with args ${JSON.stringify(toolArgs)}]`);
                    messages.push({
                        role: "user",
                        content: typeof result === "string" ? result : (result.content ?? JSON.stringify(result)),
                    });
                    const followupResponse = await this.anthropic.messages.create({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 1000,
                        messages,
                    });
                    finalText.push(followupResponse.content[0].type === "text" ? followupResponse.content[0].text : "");
                }
                else {
                    const result = await this.mcp.callTool({
                        name: toolName,
                        arguments: toolArgs,
                    });
                    finalText.push(`[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`);
                    messages.push({
                        role: "user",
                        content: result.content,
                    });
                    const followupResponse = await this.anthropic.messages.create({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 1000,
                        messages,
                    });
                    finalText.push(followupResponse.content[0].type === "text" ? followupResponse.content[0].text : "");
                }
            }
        }
        return finalText.join("\n");
    }
    async chatLoop() {
        const rl = promises_1.default.createInterface({
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
        }
        finally {
            rl.close();
        }
    }
    async cleanup() {
        await this.mcp.close();
    }
}
exports.MCPClient = MCPClient;
