"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import GoLiveModal from "./GoLiveModal";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { signOut } from "firebase/auth";

const TopBar = ({ username, userId }) => {
  const [showModal, setShowModal] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const userDoc = doc(db, "users", userId);
    const unsubscribe = onSnapshot(userDoc, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setIsStreaming(data.isStreaming);
      } else {
        console.log("No such document!");
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const handleGoLive = () => {
    setShowModal(true);
  };

  const handleStopStream = async () => {
    const userDoc = doc(db, "users", userId);
    await updateDoc(userDoc, { isStreaming: false });
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
            streamInfo={null} // You may need to pass this if it's available
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
