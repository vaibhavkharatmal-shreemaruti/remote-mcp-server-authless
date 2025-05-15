import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "OpenSMILeTools",
		version: "1.0.0",
	});

	async init() {
		// Single shipment status tool
		this.server.tool(
			"single_shipment_status",
			{ single_shipment_id: z.string() },
			async ({ single_shipment_id }) => {
				try {
					const response = await fetch(
						`https://apis.delcaper.com/tracking/status/${single_shipment_id}?type=customer`
					);
					
					if (!response.ok) {
						return {
							content: [{ 
								type: "text", 
								text: `Error: Failed to fetch shipment status (${response.status})` 
							}]
						};
					}

					const data = await response.json();
					return {
						content: [{ 
							type: "text", 
							text: JSON.stringify(data, null, 2)
						}]
					};
				} catch (error) {
					return {
						content: [{ 
							type: "text", 
							text: `Error: ${error.message}` 
						}]
					};
				}
			}
		);

		// Bulk shipment status tool
		this.server.tool(
			"multiple_shipment_status",
			{
				shipment_ids: z.string(),
			},
			async ({ shipment_ids }) => {
				try {
					const awbNumbers = shipment_ids.join(',');
					const response = await fetch(
						`https://apis.delcaper.com/tracking/bulk?awbNumbers=${awbNumbers}`
					);

					if (!response.ok) {
						return {
							content: [{ 
								type: "text", 
								text: `Error: Failed to fetch bulk shipment status (${response.status})` 
							}]
						};
					}

					const data = await response.json();
					return {
						content: [{ 
							type: "text", 
							text: JSON.stringify(data, null, 2)
						}]
					};
				} catch (error) {
					return {
						content: [{ 
							type: "text", 
							text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}` 
						}]
					};
				}
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			// @ts-ignore
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			// @ts-ignore
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
