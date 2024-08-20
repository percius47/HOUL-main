"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import TopBar from "./Components/Topbar";
import StreamGrid from "./Components/StreamGrid";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase/firebase";

export default function Home() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  async function handleUserAuth(user) {
    if (!user) return;

    const userDoc = doc(db, "users", user.uid);

    const docSnap = await getDoc(userDoc);

    if (!docSnap.exists()) {
      await setDoc(userDoc, {
        username: user.email.match(/^([^@]+)/)[0],
        isStreaming: false,
        subscribers: 0,
        // photoUrl: user.photoUrl,
        serverURL: "rtmp://13.234.177.100:1935/houl1/live1", //default channel
        streamKey: "live1", //default key
        streamUrl:
          "https://f53112b70bc31005.mediapackage.ap-south-1.amazonaws.com/out/v1/800c429a166b4c87afc03c4e6f2cac44/index.m3u8", //  default  streamUrl
      });
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("firebaseToken");
    if (token) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUser(user);
          await handleUserAuth(user); // Ensure Firestore user document is created
          console.log("user in homepage", user.email);
        } else {
          localStorage.removeItem("firebaseToken");
          router.push("/auth");
        }
      });
      return () => unsubscribe();
    } else {
      router.push("/auth"); // Redirect to login if no token is found
    }
  }, [router]);

  if (!user) {
    return null; // You can return a loading spinner here if needed
  }

  return (
    <div>
      <TopBar username={user.email} userId={user.uid} />
      <StreamGrid userId={user.uid} />
    </div>
  );
}
