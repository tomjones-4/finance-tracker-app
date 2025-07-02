import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { Transaction } from "../types/supabase";

interface TransactionsProps {
  session: Session;
}

const Transactions = ({ session }: TransactionsProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!session) return;
    fetch("/plaid/transactions", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        // setTransactions(data.transactions || []);
        setTransactions(data || []);
        console.log("Fetched transactions - data:", data);
      });
  }, [session]);

  return (
    <>
      {transactions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Transactions</h2>
          <table className="min-w-full bg-gray-800 rounded">
            <thead>
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Category</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-2">{tx.date}</td>
                  <td className="px-4 py-2">{tx.name}</td>
                  <td className="px-4 py-2">${tx.amount}</td>
                  <td className="px-4 py-2">{tx.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default Transactions;
