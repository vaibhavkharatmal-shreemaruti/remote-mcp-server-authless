import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define interfaces for our data structures
interface Address {
	name: string;
	email: string;
	phone: string;
	address1: string;
	address2: string;
	city: string;
	state: string;
	country: string;
	zip: string;
}

interface LineItem {
	name: string;
	price: number;
	weight: number;
	quantity: number;
	sku: string;
	unitPrice: number;
}

interface BookingData {
	pickupAddress_name: string;
	pickupAddress_email: string;
	pickupAddress_phone: string;
	pickupAddress_address1: string;
	pickupAddress_address2: string;
	pickupAddress_city: string;
	pickupAddress_state: string;
	pickupAddress_country: string;
	pickupAddress_zip: string;
	shippingAddress_name: string;
	shippingAddress_email: string;
	shippingAddress_phone: string;
	shippingAddress_address1: string;
	shippingAddress_address2: string;
	shippingAddress_city: string;
	shippingAddress_state: string;
	shippingAddress_country: string;
	shippingAddress_zip: string;
	weight: number;
	length: number;
	width: number;
	height: number;
	amount: number;
	item_name: string;
}

// Add these interfaces before the MyMCP class
interface AuthResponse {
	data: {
		accessToken: string;
	};
}

interface RateResponse {
	data: {
		shippingCharge: number;
	};
}

interface PushOrderResponse {
	data: {
		awbNumber?: string;
	};
}

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	private AUTH_URL = "https://qaapis.delcaper.com/auth/login";
	private SERVICEABILITY_URL = "https://qaapis.delcaper.com/fulfillment/public/seller/order/check-ecomm-order-serviceability";
	private RATE_URL = "https://qaapis.delcaper.com/fulfillment/rate-card/calculate-rate/ecomm";
	private PUSH_ORDER_URL = "https://qaapis.delcaper.com/fulfillment/public/seller/order/ecomm/push-order";
	private AUTH_EMAIL = "amit.salve@shreemaruti.com";
	private AUTH_PASSWORD = "Amit@1993";
	private VENDOR_TYPE = "SELLER";

	server = new McpServer({
		name: "OpenSMILeTools",
		version: "1.0.0",
	});

	async init() {
		// Single shipment status tool
		this.server.tool(
			"single_shipment_status",
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

		// Bulk shipment status tool
		this.server.tool(
			"multiple_shipment_status",
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

		// single shipment booking by channel partner
		this.server.tool(
			"single_shipment_booking",
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

		// Booking tool
		this.server.tool(
			"book_shipment",
			{
					pickupAddress_name: z.string(),
					pickupAddress_email: z.string(),
					pickupAddress_phone: z.string(),
					pickupAddress_address1: z.string(),
					pickupAddress_address2: z.string(),
					pickupAddress_city: z.string(),
					pickupAddress_state: z.string(),
					pickupAddress_country: z.string(),
					pickupAddress_zip: z.string(),
					shippingAddress_name: z.string(),
					shippingAddress_email: z.string(),
					shippingAddress_phone: z.string(),
					shippingAddress_address1: z.string(),
					shippingAddress_address2: z.string(),
					shippingAddress_city: z.string(),
					shippingAddress_state: z.string(),
					shippingAddress_country: z.string(),
					shippingAddress_zip: z.string(),
					weight: z.number(),
					length: z.number(),
					width: z.number(),
					height: z.number(),
					amount: z.number(),
					item_name: z.string(),
			},
			async ({ booking_data }: { booking_data: BookingData }) => {
				try {
					// 1. Authenticate
					const authResponse = await fetch(this.AUTH_URL, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							email: this.AUTH_EMAIL,
							password: this.AUTH_PASSWORD,
							vendorType: this.VENDOR_TYPE
						})
					});

					if (!authResponse.ok) {
						throw new Error(`Authentication failed: ${authResponse.status}`);
					}

					const authData = await authResponse.json() as AuthResponse;
					const token = authData.data.accessToken;

					// 2. Check serviceability
					const serviceabilityResponse = await fetch(this.SERVICEABILITY_URL, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${token}`
						},
						body: JSON.stringify({
							fromPincode: parseInt(booking_data.pickupAddress_zip),
							toPincode: parseInt(booking_data.shippingAddress_zip),
							isCodOrder: false,
							deliveryMode: "AIR"
						})
					});

					if (!serviceabilityResponse.ok) {
						throw new Error(`Serviceability check failed: ${serviceabilityResponse.status}`);
					}

					// 3. Calculate rate
					const rateResponse = await fetch(this.RATE_URL, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${token}`
						},
						body: JSON.stringify({
							deliveryPromise: "SURFACE",
							fromPincode: booking_data.pickupAddress_zip,
							toPincode: booking_data.shippingAddress_zip,
							weight: booking_data.weight,
							length: booking_data.length,
							width: booking_data.width,
							height: booking_data.height
						})
					});

					if (!rateResponse.ok) {
						throw new Error(`Rate calculation failed: ${rateResponse.status}`);
					}

					const rateData = await rateResponse.json() as RateResponse;
					const shippingCharge = rateData.data.shippingCharge;

					// 4. Generate order ID
					const orderId = `${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.random().toString(36).substring(2, 8)}`;

					// 5. Prepare order data
					const orderData = {
						orderId,
						orderSubtype: "FORWARD",
						orderCreatedAt: new Date().toISOString(),
						currency: "INR",
						amount: booking_data.amount,
						weight: booking_data.weight,
						lineItems: [{
							name: booking_data.item_name,
							price: booking_data.amount,
							weight: booking_data.weight,
							quantity: 1,
							sku: "",
							unitPrice: booking_data.amount
						}],
						paymentType: "COD",
						paymentStatus: "PENDING",
						subTotal: shippingCharge,
						remarks: "handle with care",
						shippingAddress: {
							name: booking_data.shippingAddress_name,
							email: booking_data.shippingAddress_email,
							phone: booking_data.shippingAddress_phone,
							address1: booking_data.shippingAddress_address1,
							address2: booking_data.shippingAddress_address2,
							city: booking_data.shippingAddress_city,
							state: booking_data.shippingAddress_state,
							country: booking_data.shippingAddress_country,
							zip: booking_data.shippingAddress_zip
						},
						billingAddress: {
							name: booking_data.pickupAddress_name,
							email: booking_data.pickupAddress_email,
							phone: booking_data.pickupAddress_phone,
							address1: booking_data.pickupAddress_address1,
							address2: booking_data.pickupAddress_address2,
							city: booking_data.pickupAddress_city,
							state: booking_data.pickupAddress_state,
							country: booking_data.pickupAddress_country,
							zip: booking_data.pickupAddress_zip
						},
						pickupAddress: {
							name: booking_data.pickupAddress_name,
							email: booking_data.pickupAddress_email,
							phone: booking_data.pickupAddress_phone,
							address1: booking_data.pickupAddress_address1,
							address2: booking_data.pickupAddress_address2,
							city: booking_data.pickupAddress_city,
							state: booking_data.pickupAddress_state,
							country: booking_data.pickupAddress_country,
							zip: booking_data.pickupAddress_zip
						},
						returnAddress: {
							name: booking_data.pickupAddress_name,
							email: booking_data.pickupAddress_email,
							phone: booking_data.pickupAddress_phone,
							address1: booking_data.pickupAddress_address1,
							address2: booking_data.pickupAddress_address2,
							city: booking_data.pickupAddress_city,
							state: booking_data.pickupAddress_state,
							country: booking_data.pickupAddress_country,
							zip: booking_data.pickupAddress_zip
						},
						gst: 5,
						length: booking_data.length,
						height: booking_data.height,
						width: booking_data.width,
					};

					// 6. Push order
					const pushOrderResponse = await fetch(this.PUSH_ORDER_URL, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${token}`
						},
						body: JSON.stringify(orderData)
					});

					if (!pushOrderResponse.ok) {
						throw new Error(`Order push failed: ${pushOrderResponse.status}`);
					}

					const pushOrderData = await pushOrderResponse.json() as PushOrderResponse;

					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								status: "success",
								orderId: orderId,
								awbNumber: pushOrderData.data.awbNumber,
								shippingCharge: shippingCharge,
								message: "Booking successful",
								raw: pushOrderData
							}, null, 2)
						}]
					};

				} catch (error) {
					return {
						content: [{
							type: "text",
							text: JSON.stringify({
								status: "error",
								message: error instanceof Error ? error.message : 'Unknown error occurred'
							}, null, 2)
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
