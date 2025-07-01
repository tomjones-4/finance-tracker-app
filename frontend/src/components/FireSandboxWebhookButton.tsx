import { Session } from "@supabase/supabase-js";
import { useState } from "react";

interface FireSandboxWebhookButtonProps {
  session: Session;
  plaidItemAccessToken: string;
}

const FireSandboxWebhookButton = ({
  session,
  plaidItemAccessToken,
}: FireSandboxWebhookButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const fireWebhook = async () => {
    setLoading(true);
    setMsg("");
    const res = await fetch("/plaid/sandbox/fire_webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        // plaid_item_id: plaidItemId,
        // access_token: session.access_token,
        access_token: plaidItemAccessToken,
        webhook_type: "TRANSACTIONS",
        webhook_code: "DEFAULT_UPDATE",
      }),
    });
    const data = await res.json();
    setMsg(data.message || "Webhook fired!");
    setLoading(false);
  };

  return (
    <div>
      <button
        className="px-4 py-2 bg-blue-600 rounded text-white"
        onClick={fireWebhook}
        disabled={loading}
      >
        {loading ? "Firing..." : "Generate Test Transactions"}
      </button>
      {msg && <div className="mt-2 text-green-400">{msg}</div>}
    </div>
  );
};

export default FireSandboxWebhookButton;
