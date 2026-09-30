"use client";

import Script from "next/script";
import { useCallback, useId, useRef, useState } from "react";

type PayPalActions = {
  subscription: { create(input: { plan_id: string; custom_id?: string }): Promise<string> };
};

type PayPalButtonOptions = {
  style: { shape: string; color: string; layout: string; label: string };
  createSubscription(data: unknown, actions: PayPalActions): Promise<string>;
  onApprove(data: { subscriptionID?: string }): Promise<void>;
  onError(error: unknown): void;
};

declare global {
  interface Window {
    paypal?: { Buttons(options: PayPalButtonOptions): { render(selector: string): Promise<void> } };
  }
}

type Props = {
  creator: "don" | "unk";
  signedIn: boolean;
  userId?: string;
  clientId?: string;
  planId?: string;
};

export default function SuperfanButton({ creator, signedIn, userId, clientId, planId }: Props) {
  const reactId = useId();
  const containerId = `paypal-superfan-${creator}-${reactId.replace(/:/g, "")}`;
  const rendered = useRef(false);
  const [message, setMessage] = useState("");
  const configured = Boolean(clientId && planId);
  const name = creator === "don" ? "Don" : "Unk";

  const renderPayPal = useCallback(async () => {
    if (!signedIn || !userId || !planId || !window.paypal || rendered.current) return;
    rendered.current = true;
    try {
      await window.paypal.Buttons({
        style: { shape: "pill", color: "gold", layout: "vertical", label: "subscribe" },
        createSubscription: (_data, actions) => actions.subscription.create({ plan_id: planId, custom_id: userId }),
        onApprove: async ({ subscriptionID }) => {
          if (!subscriptionID) throw new Error("PayPal did not return a subscription number.");
          const response = await fetch("/api/superfans/record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ creator, subscriptionId: subscriptionID }),
          });
          const result = await response.json() as { error?: string };
          if (!response.ok) throw new Error(result.error || "StageFront could not record the subscription.");
          setMessage("Subscription approved. Welcome to the Zoo Crew Superfans!");
        },
        onError: () => setMessage("PayPal could not complete the subscription. Please try again."),
      }).render(`#${containerId}`);
    } catch (error) {
      rendered.current = false;
      setMessage(error instanceof Error ? error.message : "PayPal could not load.");
    }
  }, [containerId, creator, planId, signedIn, userId]);

  if (!configured) return <button type="button" disabled className="primary-cta mt-7 w-full cursor-not-allowed opacity-60">PayPal setup in progress</button>;
  if (!signedIn) return <button type="button" onClick={() => { window.location.href = "/sign-in?next=/%23superfans"; }} className="primary-cta mt-7 w-full">Sign in to subscribe to {name}</button>;

  return <div className="mt-7">
    <Script
      src={`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId!)}&vault=true&intent=subscription`}
      strategy="afterInteractive"
      onReady={() => { void renderPayPal(); }}
    />
    <div id={containerId} className="min-h-12" />
    {message ? <p aria-live="polite" className="mt-3 text-sm text-stage-gold">{message}</p> : null}
  </div>;
}
