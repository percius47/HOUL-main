"use client";

import { useState } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "../firebase/firebase";
import { useRouter } from "next/navigation";

const Login = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async (user) => {
    const token = await user.getIdToken();
    localStorage.setItem("firebaseToken", token); // Save the token to localStorage
    // onLogin(user);
    router.push("/home");
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      handleLogin(result.user);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEmailPasswordAuth = async (e) => {
    e.preventDefault();
    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
      } else {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      }
      handleLogin(userCredential.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="my-3 text-7xl font-bold text-purple-700">H O U L</h1>
      <h2 className="mb-4 text-2xl font-bold">
        {isSignUp ? "Sign Up" : "Login"}
      </h2>

      <Button className="bg-blue-600 mb-4" onClick={handleGoogleLogin}>
        {isSignUp ? "Sign Up with Google" : "Login with Google"}
      </Button>

      <form
        onSubmit={handleEmailPasswordAuth}
        className="w-full max-w-sm space-y-4"
      >
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        <Button type="submit" className="w-full">
          {isSignUp ? "Sign Up" : "Login"}
        </Button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      <p className="mt-4">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <Button variant="link" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? "Login here" : "Sign up here"}
        </Button>
      </p>
    </div>
  );
};

export default Login;
