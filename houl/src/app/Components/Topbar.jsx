"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PiSignOutBold } from "react-icons/pi";
import GoLiveModal from "./GoLiveModal";
import { Dialog, DialogPanel } from "@headlessui/react";
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
import Image from "next/image";

const TopBar = ({ userId }) => {
  const [showModal, setShowModal] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [username, setUsername] = useState("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // For profile modal
  const [credits, setCredits] = useState(100); // Initialize credits with default 100
  const [profilePicture, setProfilePicture] = useState(
    "https://github.com/shadcn.png"
  ); // Default profile picture
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const userDocRef = doc(db, "users", userId);

    // Fetch username, credits, isStreaming status, and profile picture from Firestore
    const fetchUserData = async () => {
      try {
        const userSnapshot = await getDoc(userDocRef);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();

          setUsername(userData.username);
          setIsStreaming(userData.isStreaming);
          setCredits(userData?.credits > -1 ? userData?.credits : -1);
          setProfilePicture(
            userData?.photoUrl || "https://github.com/shadcn.png"
          ); // Get profile picture or default
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();

    // Real-time subscription to updates in user's Firestore document
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setIsStreaming(data.isStreaming);
        setCredits(data?.credits > -1 ? data?.credits : -1);
        setProfilePicture(data?.photoUrl || "https://github.com/shadcn.png");
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
        router.push("/");
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
      router.push("/auth"); // Redirect to the login page or home page after sign-out
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      {/* TopBar */}
      <header className="flex justify-between items-center p-4 bg-purple-950 text-white">
        <div className="flex items-center">
          <Image
            loading="eager"
            src="/houl_darker_svg.svg"
            height={50}
            width={50}
            alt="Houl"
            className="cursor-pointer"
            onClick={() => {
              router.push(`/`);
            }}
          />
          <p className="text-[2rem] ml-2 lexend-topbarLogo  hidden lg:block ">
            Houl
          </p>
        </div>

        {/* Right Side - Profile Picture and Go Live/Stop Stream Button */}
        <div className="flex items-center space-x-4">
          {isStreaming ? (
            <Button className="bg-red-600" onClick={handleStopStream}>
              Stop Stream
            </Button>
          ) : (
            <Button className="bg-green-600" onClick={handleGoLive}>
              Go Live
            </Button>
          )}

          {/* Profile Picture */}
          {profilePicture && (
            <Image
              src={profilePicture || "https://github.com/shadcn.png"}
              height={36}
              width={36}
              className="h-9 w-9 rounded-full cursor-pointer"
              alt="Profile Picture"
              onError={(e) => (e.target.src = "https://github.com/shadcn.png")}
              onClick={() => setIsProfileModalOpen(true)} // Open profile modal on click
            />
          )}
        </div>
      </header>

      {/* Go Live Modal */}
      {showModal && (
        <GoLiveModal
          onClose={() => setShowModal(false)}
          userId={userId}
          username={username}
          setIsStreaming={setIsStreaming}
        />
      )}

      {/* Profile Info Modal */}
      <Dialog
        open={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        className="fixed inset-0 z-10 flex items-center justify-center "
      >
        <DialogPanel className="bg-gray-800 p-6 absolute lg:right-[4rem] right-[1rem] top-[4rem] rounded-lg text-white lg:w-[20vw] md:w-[30vw] w-[40vw] max-w-md">
          <div className="flex justify-center">
            <Image
              src={profilePicture || "https://github.com/shadcn.png"}
              height={36}
              width={36}
              className="h-9 w-9 rounded-full"
              alt="Profile"
              onError={(e) => (e.target.src = "https://github.com/shadcn.png")}
            />
          </div>
          <h4 className="text-center text-[0.95rem]  mb-4"> @{username}</h4>

          {/* Credits */}
          <div className="flex justify-center items-center text-lg mb-4">
            <span className="mr-2"> {credits}</span>
            <Image src="/chirpsIcon.png" height={20} width={20} />
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <Button className="bg-orange-600 w-full" onClick={handleSignOut}>
              Sign Out <PiSignOutBold className="ml-1" />
            </Button>
          </div>
        </DialogPanel>
      </Dialog>
    </>
  );
};

export default TopBar;
