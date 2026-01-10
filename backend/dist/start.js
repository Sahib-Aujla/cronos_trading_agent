"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpClient = void 0;
const mcp_1 = require("./mcp");
exports.mcpClient = new mcp_1.MCPClient();
exports.mcpClient.chatLoop();
