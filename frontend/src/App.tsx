// TODO

// Consider useContext hook for session management. For now I'll pass it as a prop but it'll probably be used in almost every component.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import LinkButton from "./plaid/LinkButton";
import Auth from "./components/Auth";
import { Session } from "@supabase/supabase-js";
import Transactions from "./components/Transactions";
import FireSandboxWebhookButton from "./components/FireSandboxWebhookButton";
import { PlaidItem } from "./types/supabase";
import PlaidItemsTable from "./components/PlaidItemsTable";

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [plaidItems, setPlaidItems] = useState<PlaidItem[]>([]);

  useEffect(() => {
    if (!session) return;
    fetch("/plaid/plaid_items", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setPlaidItems(data || []);
        console.log("Fetched Plaid items - data:", data);
      });
  }, [session]);

  const getInitialSession = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setSession(session);
  }, []);

  useEffect(() => {
    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8">Finance Tracker</h1>
      {!session ? (
        <Auth />
      ) : (
        <div className="text-center">
          <p className="text-lg mb-4">Welcome, {session.user.email}!</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mb-4"
          >
            Sign Out
          </button>
          <div>
            <LinkButton />
          </div>
          {/* <FireSandboxWebhookButton
            session={session}
            plaidItemAccessToken={
              plaidItems.length > 0 ? plaidItems[0].access_token : ""
            }
          /> */}
          <PlaidItemsTable session={session} />
          <Transactions session={session} />
        </div>
      )}
    </div>
  );
};

export default App;
