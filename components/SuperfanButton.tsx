"use client";

import Script from "next/script";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type PayPalActions = {
  subscription: { create(input: { plan_id: string; custom_id?: string }): Promise<string> };
};

type PayPalButtonOptions = {
  fundingSource?: string;
  style: { shape: string; color: string; layout: string; label: string };
  createSubscription(data: unknown, actions: PayPalActions): Promise<string>;
  onApprove(data: { subscriptionID?: string }): Promise<void>;
  onError(error: unknown): void;
};

declare global {
  interface Window {
    paypal?: {
      FUNDING: { PAYPAL: string; CARD: string };
      Buttons(options: PayPalButtonOptions): { isEligible(): boolean; render(selector: string): Promise<void> };
    };
  }
}

type Props = {
  creator: "don" | "unk";
  membershipName?: string;
  signedIn: boolean;
  userId?: string;
  clientId?: string;
  planId?: string;
};

export default function SuperfanButton({ creator, membershipName, signedIn, userId, clientId, planId }: Props) {
  const reactId = useId();
  const paypalContainerId = `paypal-superfan-${creator}-${reactId.replace(/:/g, "")}`;
  const cardContainerId = `card-superfan-${creator}-${reactId.replace(/:/g, "")}`;
  const rendered = useRef(false);
  const [message, setMessage] = useState("");
  const configured = Boolean(clientId && planId);
  const name = membershipName ?? (creator === "don" ? "Don" : "Unk");

  useEffect(() => {
    if (!signedIn) return;
    void fetch("/api/superfans/record", { method: "PUT" });
  }, [signedIn]);

  const renderPayPal = useCallback(async () => {
    if (!signedIn || !userId || !planId || !window.paypal || rendered.current) return;
    rendered.current = true;
    try {
      const paypal = window.paypal;
      const buttonOptions = (fundingSource: string, color: string): PayPalButtonOptions => ({
        fundingSource,
        style: { shape: "pill", color, layout: "vertical", label: "subscribe" },
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
      });

      const paypalButton = paypal.Buttons(buttonOptions(paypal.FUNDING.PAYPAL, "gold"));
      if (paypalButton.isEligible()) await paypalButton.render(`#${paypalContainerId}`);

      const cardButton = paypal.Buttons(buttonOptions(paypal.FUNDING.CARD, "black"));
      if (cardButton.isEligible()) await cardButton.render(`#${cardContainerId}`);
    } catch (error) {
      rendered.current = false;
      setMessage(error instanceof Error ? error.message : "PayPal could not load.");
    }
  }, [cardContainerId, creator, paypalContainerId, planId, signedIn, userId]);

  if (!configured) return <button type="button" disabled className="primary-cta mt-7 w-full cursor-not-allowed opacity-60">PayPal setup in progress</button>;
  if (!signedIn) return <button type="button" onClick={() => { window.location.href = "/sign-in?next=/%23superfans"; }} className="primary-cta mt-7 w-full">Sign in to join {name}</button>;

  return <div className="mt-7">
    <Script
      src={`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId!)}&vault=true&intent=subscription`}
      strategy="afterInteractive"
      onReady={() => { void renderPayPal(); }}
    />
    <div id={paypalContainerId} className="min-h-12" />
    <div id={cardContainerId} className="mt-3 min-h-12" />
    {message ? <p aria-live="polite" className="mt-3 text-sm text-stage-gold">{message}</p> : null}
  </div>;
}
