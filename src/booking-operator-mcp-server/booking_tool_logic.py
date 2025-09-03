import requests
import datetime
import random
import string
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class BookingTool:
    def __init__(self):
        self.auth_url = "https://qaapis.delcaper.com/auth/login"
        self.serviceability_url = "https://qaapis.delcaper.com/fulfillment/public/seller/order/check-ecomm-order-serviceability"
        self.rate_url = "https://qaapis.delcaper.com/fulfillment/rate-card/calculate-rate/ecomm"
        self.push_order_url = "https://qaapis.delcaper.com/fulfillment/public/seller/order/ecomm/push-order"
        self.auth_email = "amit.salve@shreemaruti.com"
        self.auth_password = "Amit@1993"
        self.vendor_type = "SELLER"

    def authenticate(self) -> str:
        payload = {
            "email": self.auth_email,
            "password": self.auth_password,
            "vendorType": self.vendor_type
        }
        headers = {"Content-Type": "application/json"}
        response = requests.post(self.auth_url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data["data"]["accessToken"]

    def check_serviceability(self, from_pincode: str, to_pincode: str, token: str) -> Dict[str, Any]:
        try:
            payload = {
                "fromPincode": int(from_pincode),
                "toPincode": int(to_pincode),
                "isCodOrder": False,
                "deliveryMode": "AIR"
            }
            print("SERVICEABILITY PAYLOAD:", payload)
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
            response = requests.post(self.serviceability_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            print("RAW SERVICEABILITY RESPONSE:", data)
            return data
        except Exception as e:
            print("ERROR IN check_serviceability:", e)
            raise

    def calculate_rate(self, from_pincode: str, to_pincode: str, weight: float, length: float, width: float, height: float, token: str) -> Dict[str, Any]:
        payload = {
            "deliveryPromise": "SURFACE",
            "fromPincode": from_pincode,
            "toPincode": to_pincode,
            "weight": weight,
            "length": length,
            "width": width,
            "height": height
        }
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
        response = requests.post(self.rate_url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()

    def generate_order_id(self) -> str:
        today = datetime.datetime.now()
        date_str = today.strftime("%d%m%Y")
        random_str = ''.join(random.choices(string.ascii_lowercase, k=6))
        return date_str + random_str

    def push_order(self, order_data: Dict[str, Any], token: str) -> Dict[str, Any]:
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
        response = requests.post(self.push_order_url, json=order_data, headers=headers)
        response.raise_for_status()
        return response.json()

    def book_shipment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        print("INPUT DATA TYPE:", type(data))
        print("INPUT DATA:", data)
        if isinstance(data, list):
            data = data[0]
            print("USING FIRST ELEMENT OF LIST AS DATA:", data)
        
        try:
            # 1. Authenticate
            token = self.authenticate()
            logger.info("Authenticated successfully.")
            print("AUTH RESPONSE:", token)

            # 2. Serviceability check
            serviceability = self.check_serviceability(
                from_pincode=data["pickupAddress_zip"],
                to_pincode=data["shippingAddress_zip"],
                token=token
            )
            logger.info(f"Serviceability: {serviceability}")
            print("SERVICEABILITY RESPONSE:", serviceability)

            # 3. Rate calculation
            rate = self.calculate_rate(
                from_pincode=data["pickupAddress_zip"],
                to_pincode=data["shippingAddress_zip"],
                weight=data["weight"],
                length=data["length"],
                width=data["width"],
                height=data["height"],
                token=token
            )
            logger.info(f"Rate: {rate}")
            shipping_charge = rate["data"].get("shippingCharge", 0)
            print("RATE RESPONSE:", rate)

            # 4. Generate order ID
            order_id = self.generate_order_id()

            # 5. Prepare order data

            amount = data["amount"]
            price = amount 
            order_data = {
                "orderId": order_id,
                "orderSubtype": "FORWARD",
                "orderCreatedAt": datetime.datetime.utcnow().isoformat(),
                "currency": "INR",
                "amount": amount,
                "weight": data["weight"],
                "lineItems": [
                    {
                        "name": data["item_name"],
                        "price": price,
                        "weight": data["weight"],
                        "quantity": 1,
                        "sku": "",
                        "unitPrice": price
                    }
                ],
                "paymentType": "COD",
                "paymentStatus": "PENDING",
                "subTotal": shipping_charge,
                "remarks": "handle with care",
                "shippingAddress": {
                    "name": data["shippingAddress_name"],
                    "email": data["shippingAddress_email"],
                    "phone": data["shippingAddress_phone"],
                    "address1": data["shippingAddress_address1"],
                    "address2": data["shippingAddress_address2"],
                    "city": data["shippingAddress_city"],
                    "state": data["shippingAddress_state"],
                    "country": data["shippingAddress_country"],
                    "zip": data["shippingAddress_zip"]
                },
                "billingAddress": {
                    "name": data["pickupAddress_name"],
                    "email": data["pickupAddress_email"],
                    "phone": data["pickupAddress_phone"],
                    "address1": data["pickupAddress_address1"],
                    "address2": data["pickupAddress_address2"],
                    "city": data["pickupAddress_city"],
                    "state": data["pickupAddress_state"],
                    "country": data["pickupAddress_country"],
                    "zip": data["pickupAddress_zip"]
                },
                "pickupAddress": {
                    "name": data["pickupAddress_name"],
                    "email": data["pickupAddress_email"],
                    "phone": data["pickupAddress_phone"],
                    "address1": data["pickupAddress_address1"],
                    "address2": data["pickupAddress_address2"],
                    "city": data["pickupAddress_city"],
                    "state": data["pickupAddress_state"],
                    "country": data["pickupAddress_country"],
                    "zip": data["pickupAddress_zip"]
                },
                "returnAddress": {
                    "name": data["pickupAddress_name"],
                    "email": data["pickupAddress_email"],
                    "phone": data["pickupAddress_phone"],
                    "address1": data["pickupAddress_address1"],
                    "address2": data["pickupAddress_address2"],
                    "city": data["pickupAddress_city"],
                    "state": data["pickupAddress_state"],
                    "country": data["pickupAddress_country"],
                    "zip": data["pickupAddress_zip"]
                },
                "gst": 5,
                "length": data["length"],
                "height": data["height"],
                "width": data["width"],
            }

            # 6. Push order
            push_result = self.push_order(order_data, token)
            logger.info(f"Push order result: {push_result}")
            print("PUSH ORDER RESPONSE:", push_result)

            return {
                "status": "success",
                "orderId": order_id,
                "awbNumber": push_result["data"].get("awbNumber"),
                "shippingCharge": shipping_charge,
                "message": "Booking successful",
                "raw": push_result
            }
        except Exception as e:
            logger.error(f"Booking failed: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
        
   
