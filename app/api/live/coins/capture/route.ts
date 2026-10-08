import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";
import { paypalAccessToken, paypalConfiguration } from "@/lib/paypal";

export const runtime = "nodejs";
type PayPalOrder = {
  status?: string;
  purchase_units?: {
    custom_id?: string;
    amount?: { value?: string; currency_code?: string };
    payments?: {
      captures?: {
        id?: string;
        status?: string;
        amount?: { value?: string; currency_code?: string };
      }[];
    };
  }[];
};
function redirect(status: string, returnTo = "live") {
  const path = returnTo === "profile" ? "/profile" : "/live";
  return Response.redirect(
    new URL(`${path}?coins=${status}`, "https://www.stagefrontdtv.com"),
    303,
  );
}

export async function GET(request: Request) {
  const returnTo =
    new URL(request.url).searchParams.get("returnTo") === "profile"
      ? "profile"
      : "live";
  const user = await authenticatedUser();
  if (!user) return redirect("sign-in-required", returnTo);
  const orderId = new URL(request.url).searchParams.get("token");
  if (!orderId || !/^[A-Z0-9]{8,32}$/.test(orderId))
    return redirect("payment-not-found", returnTo);
  const db = serviceConfiguration();
  const paypal = paypalConfiguration("don");
  if (!db || !paypal) return redirect("payment-setup-required", returnTo);

  try {
    const lookup = new URLSearchParams({
      select: "paypal_order_id,amount_cents,status",
      paypal_order_id: "eq." + orderId,
      user_id: "eq." + user.id,
      limit: "1",
    });
    const result = await fetch(
      db.url + "/rest/v1/zoo_live_coin_purchases?" + lookup,
      {
        headers: {
          apikey: db.serviceKey,
          Authorization: "Bearer " + db.serviceKey,
        },
        cache: "no-store",
      },
    );
    if (!result.ok) return redirect("verify-failed", returnTo);
    const [pending] = (await result.json()) as {
      paypal_order_id: string;
      amount_cents: number;
      status: string;
    }[];
    if (!pending) return redirect("order-not-found", returnTo);
    if (pending.status === "paid") return redirect("added", returnTo);

    const accessToken = await paypalAccessToken(paypal);
    let response = await fetch(
      paypal.apiBase + "/v2/checkout/orders/" + orderId + "/capture",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
          "PayPal-Request-Id": "capture-" + orderId,
        },
        body: "{}",
        cache: "no-store",
      },
    );
    let order = (await response.json()) as PayPalOrder;
    if (!response.ok) {
      response = await fetch(
        paypal.apiBase + "/v2/checkout/orders/" + orderId,
        {
          headers: { Authorization: "Bearer " + accessToken },
          cache: "no-store",
        },
      );
      order = (await response.json()) as PayPalOrder;
    }

    const unit = order.purchase_units?.[0];
    const capture = unit?.payments?.captures?.find(
      (item) => item.status === "COMPLETED",
    );
    const amount = Number(capture?.amount?.value || unit?.amount?.value);
    const amountCents = Math.round(amount * 100);
    if (
      order.status !== "COMPLETED" ||
      unit?.custom_id !== user.id ||
      (capture?.amount?.currency_code || unit?.amount?.currency_code) !==
        "USD" ||
      amountCents !== pending.amount_cents ||
      !capture?.id
    )
      return redirect("verify-failed", returnTo);

    const fulfilled = await fetch(
      db.url + "/rest/v1/rpc/zoo_live_fulfill_coin_order",
      {
        method: "POST",
        headers: {
          apikey: db.serviceKey,
          Authorization: "Bearer " + db.serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_order_id: orderId,
          p_capture_id: capture.id,
          p_amount_cents: amountCents,
        }),
        cache: "no-store",
      },
    );
    if (!fulfilled.ok) {
      console.error("Zoo coin purchase fulfillment failed", {
        orderId,
        status: fulfilled.status,
      });
      return redirect("processing", returnTo);
    }
    return redirect("added", returnTo);
  } catch (error) {
    console.error("Zoo coin capture verification failed", error);
    return redirect("processing", returnTo);
  }
}
