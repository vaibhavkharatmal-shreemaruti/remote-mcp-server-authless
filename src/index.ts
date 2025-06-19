import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define interfaces for the new serviceability API
interface ServiceabilityRequest {
	source_postal_code: string;
	destination_postal_code: string;
	parcel_category: string;
	// product_type?: string;
}

interface ServiceabilityResponse {
	success: boolean;
	is_serviceable: boolean;
	data: {
		source_postal_code: string;
		destination_postal_code: string;
		serviceability: Array<{
			parcel_category_code: string;
			is_serviceable: boolean;
			services: Array<{
				service_code: string;
				tat_days: number;
				is_cod: boolean;
				pickup: boolean;
				delivery: boolean;
				insurance: boolean;
				product_types: {
					express: boolean;
					standard: boolean;
				};
				delivery_modes: {
					air: boolean;
					surface: boolean;
				};
			}>;
		}>;
	};
}

// Interface for single postal code serviceability response
interface SinglePostalCodeResponse {
	success: boolean;
	is_serviceable: boolean;
	data: {
		destination_postal_code: string;
		serviceability: Array<{
			parcel_category_code: string;
			is_serviceable: boolean;
			services: Array<{
				service_code: string;
				tat_days: number;
				is_cod: boolean;
				pickup: boolean;
				delivery: boolean;
				insurance: boolean;
				product_types: {
					express: boolean;
					standard: boolean;
				};
				delivery_modes: {
					air: boolean;
					surface: boolean;
				};
			}>;
		}>;
	};
}


// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	private AUTH_URL = "https://apis.delcaper.com/auth/login";
	private SERVICEABILITY_URL = "https://sandbox-apis.prayog.io/serviceability/v1/check";
	private RATE_URL = "https://qaapis.delcaper.com/fulfillment/rate-card/calculate-rate/ecomm";
	private PUSH_ORDER_URL = "https://qaapis.delcaper.com/fulfillment/public/seller/order/ecomm/push-order";
	private AUTH_EMAIL = "vaibhav.kharatmal@shreemaruti.com";
	private AUTH_PASSWORD = "MWywx7260Y$%";
	private VENDOR_TYPE = "SELLER";

	server = new McpServer({
		name: "OpenSMILeTools",
		version: "1.0.0",
	});

	async init() {
		// Single shipment status tool
		this.server.tool(
			"single_shipment_status",
			"Check the status of a shipment by its AWB number. Use this when user asks to check the status of a shipment by its AWB number.",
			{ single_shipment_id: z.string() },
			async ({ single_shipment_id }: { single_shipment_id: string }) => {
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
				} catch (error: unknown) {
					return {
						content: [{ 
							type: "text", 
							text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}` 
						}]
					};
				}
			}
		);
		// phone number shipment status tool
		this.server.tool(
			"phone_number_shipment_status",
			"Check the status of a shipment by its phone number. Use this when user asks to check the status of a shipment by its phone number.",
			{ phone_number: z.string() },
			async ({ phone_number }: { phone_number: string }) => {
				try {
					const response = await fetch(
						`https://apis.delcaper.com/tracking/fetchActiveAwbs/${phone_number}`
					);
					
					if (!response.ok) {
						return {
							content: [{ 
								type: "text", 
								text: await response.json() 
							}]
						};
					}

					const data = await response.json();
					return {
						content: [{ 
							type: "text", 
							text: JSON.stringify(data[0], null, 2)
						}]
					};
				} catch (error: unknown) {
					return {
						content: [{ 
							type: "text", 
							text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}` 
						}]
					};
				}
			}
		);

		// Bulk shipment status tool
		this.server.tool(
			"multiple_shipment_status",
			"Check the status of multiple shipments by their Tracking Number/Consignment Number/Waybill Number/Airway Bill Number/AWB Number/Shipment ID/Docket Number/Courier Number/Parcel Number. Use this when user asks to check the status of multiple shipments.",
			{
				shipment_ids: z.string(),
			},
			async ({ shipment_ids }: { shipment_ids: string }) => {
				try {
					const awbNumbers = shipment_ids.split(',');
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
				} catch (error: unknown) {
					return {
						content: [{ 
							type: "text", 
							text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}` 
						}]
					};
				}
			}
		);

		// New serviceability checking tool
		this.server.tool(
			"Source to Destination Serviceability",
			"Check serviceability between two postal codes for parcel delivery. Use this when user asks to check serviceability from one location to another.",
			{
				source_postal_code: z.string().describe("The source postal code where the parcel will be picked up from"),
				destination_postal_code: z.string().describe("The destination postal code where the parcel will be delivered to"),
				parcel_category: z.string().describe("The category of parcel (e.g., ecomm, courier, cargo, cargo_international etc.)"),
				// product_type: z.string().optional(),
			},
			async ({
				source_postal_code,
				destination_postal_code,
				parcel_category,
				// product_type,
			}: {
				source_postal_code: string;
				destination_postal_code: string;
				parcel_category: string;
				// product_type?: string;
			}) => {
				try {
					const requestBody: ServiceabilityRequest = {
						source_postal_code,
						destination_postal_code,
						parcel_category,
						// ...(product_type && { product_type }),
					};

					const response = await fetch(this.SERVICEABILITY_URL, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(requestBody),
					});

					if (!response.ok) {
						return {
							content: [{
								type: "text",
								text: `Error: Failed to check serviceability (${response.status})`
							}]
						};
					}

					const data = await response.json() as ServiceabilityResponse;
					
					return {
						content: [{
							type: "text",
							text: JSON.stringify(data, null, 2)
						}]
					};
				} catch (error: unknown) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
						}]
					};
				}
			}
		);

		// Single postal code serviceability checking tool
		this.server.tool(
			"Single Postal Code Serviceability",
			"Check serviceability for a single postal code. Use this when user asks to check if a specific postal code or contain single postal code is serviceable.",
			{
				postal_code: z.string().describe("The postal code to check serviceability for"),
				api_token: z.string().optional().describe(""),
			},
			async ({
				postal_code,
				api_token,
			}: {
				postal_code: string;
				api_token?: string;
			}) => {
				try {
					const headers: Record<string, string> = {
						'Content-Type': 'application/json',
					};

					if (api_token) {
						headers['Authorization'] = `Bearer ${api_token}`;
					}

					const response = await fetch(`${this.SERVICEABILITY_URL}/${postal_code}`, {
						method: 'GET',
						headers,
					});

					if (!response.ok) {
						return {
							content: [{
								type: "text",
								text: `Error: Failed to check postal code serviceability (${response.status})`
							}]
						};
					}

					const data = await response.json() as SinglePostalCodeResponse;
					
					return {
						content: [{
							type: "text",
							text: JSON.stringify(data, null, 2)
						}]
					};
				} catch (error: unknown) {
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
						}]
					};
				}
			}
		);

		// rate card tool
		this.server.tool(
			"Rate Card",
			"Calculate the rate of a shipment by source and destination postal codes. Use this when user asks to calculate the rate of a shipment by source and destination postal codes.",
			{
				source_postal_code: z.string().describe("The source postal code where the parcel will be picked up from"),
				destination_postal_code: z.string().describe("The destination postal code where the parcel will be delivered to"),
				parcel_category: z.string().describe("The category of parcel (e.g., ecomm, courier, cargo, cargo_international etc.)"),
				deliveryPromise: z.string().optional(),
				weight: z.number().optional(),
				length: z.number().optional(),
				width: z.number().optional(),
				height: z.number().optional(),
				volumetricWeight: z.number().optional()
			},
			async ({
				source_postal_code,
				destination_postal_code,
				parcel_category,
				deliveryPromise,
				weight,
				length,
				width,
				height,
				volumetricWeight
			}) => {
				try {
					// 1. Authenticate to get the Bearer token
					const authResponse = await fetch("https://apis.delcaper.com/auth/login", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							email: "vaibhav.kharatmal@shreemaruti.com",
							password: "MWywx7260Y$%",
							vendorType: "SELLER"
						})
					});

					if (!authResponse.ok) {
						return {
							content: [{
								type: "text",
								text: `Error: Failed to authenticate (${authResponse.status})`
							}]
						};
					}

					const authData = await authResponse.json();
					const accessToken = authData?.data?.accessToken;
					if (!accessToken) {
						return {
							content: [{
								type: "text",
								text: "Error: No access token received from authentication."
							}]
						};
					}

					// 2. Prepare the payload for the rate card API
					const payload = {
						deliveryPromise,
						fromPincode: source_postal_code,
						toPincode: destination_postal_code,
						weight: weight || 125,
						length: length || 20,
						width: width || 20,
						height: height || 20,
						volumatricWeight: volumetricWeight || 0
					};

					// 3. Call the rate card API with the Bearer token
					const rateResponse = await fetch(
						`https://apis.delcaper.com/fulfillment/rate-card/calculate-rate/${parcel_category || 'ecomm'}`,
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								"Authorization": `Bearer ${accessToken}`
							},
							body: JSON.stringify(payload)
						}
					);

					if (!rateResponse.ok) {
						return {
							content: [{
								type: "text",
								text: `Error: Failed to fetch rate card (${rateResponse.status})`
							}]
						};
					}

					const rateData = await rateResponse.json();
					return {
						content: [{
							type: "text",
							text: JSON.stringify(rateData, null, 2)
						}]
					};
				} catch (e: any) {
					return {
						content: [{
							type: "text",
							text: `Error: ${e.message || e.toString()}`
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
