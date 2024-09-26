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
import { auth, db } from "../firebase/firebase"; // Import Firebase DB
import { doc, setDoc, getDoc } from "firebase/firestore"; // Firestore methods
import { useRouter } from "next/navigation";
import Image from "next/image";

const Login = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async (user) => {
    const token = await user.getIdToken();
    localStorage.setItem("firebaseToken", token);

    const userDoc = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDoc);

    // Check if Firestore user document already exists, if not create it
    if (!docSnap.exists()) {
      await setDoc(userDoc, {
        username: user.email.match(/^([^@]+)/)[0],
        isStreaming: false,
        subscribers: 0,
        photoUrl: user?.photoURL || null,
        credits: 100,
        channelCreated: false,
        serverUrl: "rtmp://13.234.177.100:1935/houl1/live1", //default channel
        streamKey: "live1", //default key
        streamUrl:
          "https://f53112b70bc31005.mediapackage.ap-south-1.amazonaws.com/out/v1/800c429a166b4c87afc03c4e6f2cac44/index.m3u8", // default streamUrl
      });
    }

    // Redirect to the homepage after ensuring the document is created
    router.push("/");
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleLogin(result.user); // Ensure Firestore document is created before redirect
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
      await handleLogin(userCredential.user); // Ensure Firestore document is created before redirect
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="flex mt-2  px-2 ">
        <Image
          src="/houl_darker_svg.svg"
          width={70}
          height={70}
          alt="Houl"
          className="mx-1"
        />
        <h1 className="my-3 text-7xl font-bold text-purple-700">Houl</h1>
      </div>

      <form
        onSubmit={handleEmailPasswordAuth}
        className="w-full max-w-sm space-y-4"
      >
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        <Button
          type="submit"
          className="w-full bg-purple-800 text-white text-lg"
        >
          {isSignUp ? "Sign Up" : "Sign In"}
        </Button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      <Button
        className="bg-white text-purple-800 mt-4 w-[24rem] text-lg"
        onClick={handleGoogleLogin}
      >
        <Image src="/googleLogo.png" width={40} height={40} alt="Google" />
        {isSignUp ? "Sign Up with Google" : "Sign in with Google"}
      </Button>

      <p className="mt-4">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <Button
          variant="link"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-purple-500"
        >
          {isSignUp ? "Sign in." : "Sign up here!"}
        </Button>
      </p>
    </div>
  );
};

export default Login;
