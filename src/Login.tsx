import React, { useEffect, useState } from "react";

import { Circle } from "lucide-react";
import { Button } from "./components/ui/button";

let apiUrl = "http://localhost:3000";
apiUrl = "";

function Login() {
  const [userName, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  function setTheme(setDark: boolean) {
    const root = document.documentElement;
    if (setDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }

  async function autoLogin() {
    try {
      const res = await fetch(`${apiUrl}/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const data = await res.json();
      console.log(data.role);
      let isAdmin = data.role === "admin";

      if (isAdmin) {
        isAdmin = false;
        window.location.assign("/pf/admin");
      }
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    setTheme(localStorage.getItem("theme") === "dark");

    try {
      autoLogin();
    } catch (err) {
      throw new Error("Failed to login automatically");
    }
  }, []);

  async function handleSubmit() {
    // Backend logic here
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/login`, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: userName,
          pass: password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data?.error);
        throw new Error("Failed to authenticate");
      }
      window.location.assign("/pf/admin");
    } catch (err) {
      setError("Failed to authenticate, try again");
      throw new Error(err);
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <div>
      <section className="py-2 h-screen md:py-2 bg-background">
        <div className=" flex flex-col items-center justify-center px-6 mx-auto h-full lg:py-0">
          <span className="flex p-5 w-full justify-center text-muted-foreground font-bold text-2xl">
            EPF
          </span>
          <div className="w-full bg-background rounded-lg shadow-[0_0_20px_1px_hsl(var(--foreground)/0.12)] md:mt-0 sm:max-w-md xl:p-0">
            <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-muted-foreground md:text-2xl">
                Welcome back, {password ? `${userName}` : ""}
              </h1>

              <div className="space-y-8 md:space-y-10">
                <div>
                  <label className="block mb-2 text-sm font-medium text-muted-foreground">
                    Username
                  </label>
                  <input
                    type="text"
                    name="login"
                    onChange={(e) => {
                      setUsername(e.target.value);
                    }}
                    id="Username"
                    className="bg-input/10 border border-input text-muted-foreground sm:text-sm rounded-lg focus:ring-0 focus:border-none block w-full p-2.5"
                    placeholder="dev17u"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-muted-foreground">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    onChange={(e) => {
                      setPassword(e.target.value);
                    }}
                    placeholder="••••••••"
                    className={`bg-input/10 border border-input text-foreground sm:text-sm rounded-lg  block w-full p-2.5
                      ${error ? "focus:ring-red-600 focus:border-red-500" : "focus:ring-0 focus:border-none"}
                      `}
                    required
                  />
                  {error && (
                    <span className="block pt-2 w-full text-sm text-red-500 font-bold">
                      {error}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="remember"
                        type="checkbox"
                        className="w-4 h-4 border border-border rounded bg-muted-foreground focus:ring-0"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="text-muted-foreground">
                        Remember me
                      </label>
                    </div>
                  </div>
                  <a
                    href=""
                    className="text-sm font-medium text-muted-foreground hover:underline"
                  >
                    Forgot password? (placeholder)
                  </a>
                </div>
                <Button
                  size="lg"
                  variant="outline"
                  disabled={isSubmitting || !password}
                  onClick={handleSubmit}
                  className="text-foreground hover:text-current disabled:bg-muted-foreground disabled:pointer-events-auto disabled:cursor-not-allowed transition-colors py-3 px-4 rounded font-bold w-full"
                >
                  {isSubmitting ? (
                    <span className="inline-flex overflow-hidden items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Signing in
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Login;
