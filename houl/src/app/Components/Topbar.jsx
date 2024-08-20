"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import GoLiveModal from "./GoLiveModal";
import {
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { signOut } from "firebase/auth";

const TopBar = ({ userId }) => {
  const [showModal, setShowModal] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [username, setUsername] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const userDoc = doc(db, "users", userId);

    // Fetch username and isStreaming status from Firestore
    const fetchUserData = async () => {
      try {
        const userSnapshot = await getDoc(userDoc);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          setUsername(userData.username);
          setIsStreaming(userData.isStreaming);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();

    // Listen for real-time updates on the user's streaming status
    const unsubscribe = onSnapshot(userDoc, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setIsStreaming(data.isStreaming);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const handleGoLive = () => {
    setShowModal(true);
  };

  const handleStopStream = async () => {
    try {
      // Query the streams collection to find the current user's stream
      const streamsQuery = query(
        collection(db, "streams"),
        where("author", "==", username)
      );
      const querySnapshot = await getDocs(streamsQuery);

      if (!querySnapshot.empty) {
        // Assume the first matched stream is the active one
        const streamDoc = querySnapshot.docs[0];
        const streamData = streamDoc.data();

        // Move stream data to "pastStreams" collection
        await addDoc(collection(db, "pastStreams"), {
          ...streamData,
          streamEndedAt: serverTimestamp(),
          vodUrl: streamData.streamUrl,
        });

        // Delete the document from the "streams" collection
        await deleteDoc(doc(db, "streams", streamDoc.id));

        // Update the isStreaming field in the user's document
        const userDocRef = doc(db, "users", userId);
        await updateDoc(userDocRef, { isStreaming: false });

        console.log("Stream stopped successfully.");
      } else {
        console.log("No active stream found for the user.");
      }
    } catch (error) {
      console.error("Error stopping stream:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/"); // Redirect to the login page or home page after sign-out
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="flex justify-between items-center p-4 bg-gray-800 text-white">
      <h1 className="text-xl font-bold text-purple-700">HOUL</h1>
      <div className="flex items-center space-x-4">
        <p>Welcome, {username}</p>
        {isStreaming ? (
          <Button className="bg-red-600" onClick={handleStopStream}>
            Stop Stream
          </Button>
        ) : (
          <Button className="bg-green-600" onClick={handleGoLive}>
            Go Live
          </Button>
        )}
        {showModal && (
          <GoLiveModal
            onClose={() => setShowModal(false)}
            userId={userId}
            username={username}
            setIsStreaming={setIsStreaming} // Pass function to set isStreaming
          />
        )}
        <Button className="bg-orange-600" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    </header>
  );
};

export default TopBar;
