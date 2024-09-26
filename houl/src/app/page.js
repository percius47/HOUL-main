"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import TopBar from "./Components/Topbar";
import StreamGrid from "./Components/StreamGrid";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase/firebase";
import Joyride from "react-joyride";
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
        photoUrl: user?.photoUrl || null,
        credits: 100,
        channelCreated:false,
        serverUrl: "rtmp://13.234.177.100:1935/houl1/live1", //default channel
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
const steps = [
  {
    target: ".topbar_profilePicture",
    content: "This shows your Account Information.",
  },
  {
    target: ".topbar_createChannelButton",
    content:
      "If you want to stream, Create a Live Streaming Channel by clicking here! You will get an option to 'Go Live' and you will be provided your OBS (required for Streaming) Server Url & Stream Key. Once Copied, you can start streaming from OBS, and see your preview on the next Step where you can name your stream and finally start Streaming!",
  },
  {
    target: ".topbar_StreamControlButton",
    content: "Start / Stop your Ongoing Stream from here.",
  },
  {
    target: ".stream_grid",
    content:
      "This is the area where all Live Streams Appear, Click on any of them to start watching!",
    placement: "top",
  },
];
  return (
    <div>
      <Joyride
        run={true}
        steps={steps}
        continuous
        styles={{
          options: {
            arrowColor: "#e3ffeb",
            beaconSize: 36,
            backgroundColor: "#e3ffeb",
            overlayColor: "rgba(79, 26, 0, 0.4)",
            primaryColor: "#ff0000",
            textColor: "#004a14",
            width: 400,
            zIndex: 1000,
          },
        }}
      />
      <TopBar userId={user.uid} />
      <StreamGrid userId={user.uid} />
    </div>
  );
}
