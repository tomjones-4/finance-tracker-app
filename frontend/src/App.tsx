import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";
import LinkButton from "./plaid/LinkButton";
import { Session } from "@supabase/supabase-js";

const App = () => {
  const [session, setSession] = useState<Session | null>(null);

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
  }, [getInitialSession]);

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
          <LinkButton />
        </div>
      )}
    </div>
  );
};

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center w-full">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Supabase Auth</h1>
        <p className="text-gray-400 mb-6 text-center">
          Sign in or sign up with your email and password
        </p>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-200"
            disabled={loading}
          >
            {loading ? (
              <span>Loading...</span>
            ) : isSignUp ? (
              <span>Sign Up</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
        <button
          className="w-full mt-4 text-blue-400 hover:text-blue-300 text-sm"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp
            ? "Already have an account? Sign In"
            : "Need an account? Sign Up"}
        </button>
      </div>
    </div>
  );
};

export default App;
