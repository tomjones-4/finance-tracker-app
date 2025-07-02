import { useEffect, useState } from "react";
import { PlaidItem, Account } from "../types/supabase";
import { Session } from "@supabase/supabase-js";
import FireSandboxWebhookButton from "./FireSandboxWebhookButton";

interface PlaidItemsTableProps {
  session: Session;
}

const PlaidItemsTable = ({ session }: PlaidItemsTableProps) => {
  const [plaidItems, setPlaidItems] = useState<PlaidItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/plaid/plaid_items", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then(setPlaidItems);

    fetch("/plaid/accounts", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then(setAccounts);
  }, [session]);

  const fireWebhook = async (access_token: string) => {
    setLoading(access_token);
    setMsg(null);
    const res = await fetch("/plaid/sandbox/fire_webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        access_token,
        webhook_type: "TRANSACTIONS",
        webhook_code: "DEFAULT_UPDATE",
      }),
    });
    const data = await res.json();
    setMsg(data.message || "Webhook fired!");
    setLoading(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Linked Plaid Items & Accounts</h2>
      <table className="min-w-full bg-gray-800 rounded mb-8">
        <thead>
          <tr>
            <th className="px-4 py-2">Institution</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Accounts</th>
            <th className="px-4 py-2">Test Txns</th>
          </tr>
        </thead>
        <tbody>
          {plaidItems.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-2">
                {item.institution_name || "Unknown"}
              </td>
              <td className="px-4 py-2">{item.status}</td>
              <td className="px-4 py-2">
                <ul>
                  {accounts
                    .filter((acct) => acct.plaid_item_id === item.id)
                    .map((acct) => (
                      <li key={acct.id}>
                        {acct.name} ({acct.type}/{acct.subtype}) -{" "}
                        {acct.current_balance != null
                          ? `$${acct.current_balance}`
                          : "N/A"}
                      </li>
                    ))}
                </ul>
              </td>
              <td className="px-4 py-2">
                <FireSandboxWebhookButton
                  session={session}
                  plaidItemAccessToken={item.access_token}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {msg && <div className="text-green-400 mb-4">{msg}</div>}
    </div>
  );
};

export default PlaidItemsTable;
