import { NextResponse } from "next/server";
import Razorpay from "razorpay";

// export default async function handler(req, res) {
//   if (req.method === "POST") {
//     // const { amount } = req.body;

//     const razorpay = new Razorpay({
//       key_id: process.env.RAZORPAY_KEY_ID, // Add your Razorpay Key ID
//       key_secret: process.env.RAZORPAY_KEY_SECRET, // Add your Razorpay Secret
//     });

//     const options = {
//       amount: 99 * 100, // Razorpay expects the amount in paisa (INR * 100)
//       currency: "INR",
//       receipt: `receipt_order_${Math.random() * 1000}`,
//     };

//     try {
//       const order = await razorpay.orders.create(options);
//       res.status(200).json({ orderId: order.id });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: "Failed to create order" });
//     }
//   } else {
//     res.status(405).json({ message: "Method not allowed" });
//   }
// }

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, // Add your Razorpay Key ID
  key_secret: process.env.RAZORPAY_KEY_SECRET, // Add your Razorpay Secret
});

export async function POST(request) {
  const body = await request.json();
  const { amount } = body;
  console.log("amount in route.js", amount);

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay expects the amount in paisa (INR * 100)
      currency: "INR",
      receipt: `receipt_order_${Math.random() * 1000}`,
    });
    return NextResponse.json({ orderId: order.id }, { status: 200 });
  } catch (error) {
    console.error("Error creating order", error);
    return NextResponse.json(
      { error: "error creating order" },
      { status: 500 }
    );
  }
}
