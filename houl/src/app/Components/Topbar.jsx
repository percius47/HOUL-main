"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import GoLiveModal from "./GoLiveModal";
import { IoClose } from "react-icons/io5";
import { Menu, SidebarCloseIcon } from "lucide-react"; // Import an icon for the drawer toggle
import { Dialog, DialogPanel } from "@headlessui/react"; // Using Headless UI for the drawer
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // State for controlling drawer visibility

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
      router.push("/auth"); // Redirect to the login page or home page after sign-out
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      {/* TopBar */}
      <header className="flex justify-between items-center p-4 bg-purple-950 text-white">
        <div className="flex items-center ">
          <Image loading="eager" src="/houlSvg.svg" height={50} width={50} alt="Houl" className="cursor-pointer" onClick={()=>{ router.push(`/`);}} />
        </div>

        {/* Hamburger menu for small screens */}
        <div className="sm:hidden">
          <Button
            onClick={() => setIsDrawerOpen(true)}
            className="bg-houlPurple text-houlLight p-2 rounded"
          >
            <Menu className="text-white" />
          </Button>
        </div>

        {/* Normal buttons for larger screens */}
        <div className="hidden sm:flex items-center space-x-4">
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
          <Button className="bg-orange-600" onClick={handleSignOut}>
            Sign Out
          </Button>
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

      {/* Drawer for small screens */}
      <Dialog
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        className="relative z-50"
      >
        {/* Drawer backdrop */}
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        {/* Drawer panel */}
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full max-w-xs p-4 overflow-y-auto bg-purple-950 text-gray">
          <div className="flex justify-between items-center mb-4">
            {/* <h2 className="text-lg font-bold">Menu</h2> */}
            <Button
              onClick={() => setIsDrawerOpen(false)}
              // variant="houlButton"
              className="bg-houlPurple text-houlLight text-xl p-2 rounded fixed right-0 mt-12 mr-4"
            >
              <IoClose />
            </Button>
          </div>
          <p className="text-center text-lg mt-14">Welcome {username}</p>
          <div className="mt-4 space-y-2">
            {isStreaming ? (
              <Button
                className="bg-red-600 w-full"
                onClick={() => {
                  handleStopStream();
                  setIsDrawerOpen(false);
                }}
              >
                Stop Stream
              </Button>
            ) : (
              <Button
                className="bg-green-600 w-full"
                onClick={() => {
                  handleGoLive();
                  setIsDrawerOpen(false);
                }}
              >
                Go Live
              </Button>
            )}
            <Button className="bg-orange-600 w-full" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </DialogPanel>
      </Dialog>
    </>
  );
};

export default TopBar;
