from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
from booking_tool_logic import BookingTool
import json
import asyncio

app = FastAPI()

TOOL_SCHEMA = {
    "name": "BookingTool",
    "description": "Book a shipment using the BookingTool.",
    "parameters": {
        "type": "object",
        "properties": {
            "pickupAddress_name": {"type": "string"},
            "pickupAddress_email": {"type": "string"},
            "pickupAddress_phone": {"type": "string"},
            "pickupAddress_address1": {"type": "string"},
            "pickupAddress_address2": {"type": "string"},
            "pickupAddress_city": {"type": "string"},
            "pickupAddress_state": {"type": "string"},
            "pickupAddress_country": {"type": "string"},
            "pickupAddress_zip": {"type": "string"},
            "shippingAddress_name": {"type": "string"},
            "shippingAddress_email": {"type": "string"},
            "shippingAddress_phone": {"type": "string"},
            "shippingAddress_address1": {"type": "string"},
            "shippingAddress_address2": {"type": "string"},
            "shippingAddress_city": {"type": "string"},
            "shippingAddress_state": {"type": "string"},
            "shippingAddress_country": {"type": "string"},
            "shippingAddress_zip": {"type": "string"},
            "item_name": {"type": "string"},
            "length": {"type": "number"},
            "width": {"type": "number"},
            "height": {"type": "number"},
            "weight": {"type": "number"},
            "amount": {"type": "number"},
            "price": {"type": "number"}
        },
        "required": [
            "pickupAddress_name", "pickupAddress_email", "pickupAddress_phone", "pickupAddress_address1",
            "pickupAddress_city", "pickupAddress_state", "pickupAddress_country", "pickupAddress_zip",
            "shippingAddress_name", "shippingAddress_email", "shippingAddress_phone", "shippingAddress_address1",
            "shippingAddress_city", "shippingAddress_state", "shippingAddress_country", "shippingAddress_zip",
            "item_name", "length", "width", "height", "weight", "amount", "price"
        ]
    }
}

@app.get("/mcp")
async def mcp_sse(request: Request):
    async def event_generator():
        yield f"data: {json.dumps({'tools': [TOOL_SCHEMA]})}\n\n"
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(1)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/mcp/tools")
async def list_tools():
    return [TOOL_SCHEMA]

@app.post("/mcp/tools/BookingTool")
async def call_booking_tool(request: Request):
    params = await request.json()
    tool = BookingTool()
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, tool.book_shipment, params)
    return JSONResponse(content=result)
