import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

function LinkButton() {
  const [linkToken, setLinkToken] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/plaid/create_link_token", { method: "POST" })
      .then(res => res.json())
      .then(data => setLinkToken(data.link_token));
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token) => {
      fetch("http://localhost:8000/plaid/exchange_public_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token }),
      });
    },
  });

  return <button onClick={() => open()} disabled={!ready}>Connect Bank</button>;
}

export default LinkButton;
