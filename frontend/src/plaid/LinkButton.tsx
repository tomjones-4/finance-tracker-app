import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { supabase } from "../supabaseClient";

const LinkButton = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLinkToken = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        try {
          const response = await fetch(
            "http://localhost:8000/plaid/create_link_token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );
          const data = await response.json();
          setLinkToken(data.link_token);
        } catch (error) {
          console.error("Error fetching link token:", error);
        }
      }
    };
    fetchLinkToken();
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token: string, metadata) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          await fetch("http://localhost:8000/plaid/exchange_public_token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ public_token }),
          });
          alert("Bank account linked successfully!");
        }
      } catch (error) {
        console.error("Error exchanging public token:", error);
        alert("Failed to link bank account.");
      }
    },
    onExit: (err, metadata) => {
      console.error("Plaid Link exited:", err, metadata);
      if (err != null && err.display_message != null) {
        alert(`Plaid Link error: ${err.display_message}`);
      }
    },
  });

  return (
    <button onClick={() => open()} disabled={!ready || !userId}>
      Connect Bank
    </button>
  );
};

export default LinkButton;
