"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PiSignOutBold } from "react-icons/pi";
import GoLiveModal from "./GoLiveModal";
import { Dialog, DialogPanel } from "@headlessui/react";
import * as Tooltip from "@radix-ui/react-tooltip";
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
import { auth, db, storage } from "../firebase/firebase"; // Import storage from Firebase
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // For Firebase Storage
import { signOut } from "firebase/auth";
import Image from "next/image";
import {
  BrowserView,
  MobileView,
  isBrowser,
  isMobile,
} from "react-device-detect";
import { MdEdit } from "react-icons/md";
import { Upload, X } from "lucide-react"; // X icon for undo changes
import BuyChirpsModal from "./BuyChirpsModal";
import { PlusIcon } from "@radix-ui/react-icons";

const TopBar = ({ userId }) => {
  const [showModal, setShowModal] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [username, setUsername] = useState("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // For profile modal
  const [credits, setCredits] = useState(100); // Initialize credits with default 100
  const [profilePicture, setProfilePicture] = useState(
    "https://github.com/shadcn.png"
  ); // Default profile picture
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false); // Edit profile modal state
  const [editableUsername, setEditableUsername] = useState("");
  const [editableProfilePicture, setEditableProfilePicture] = useState("");
  const [changesMade, setChangesMade] = useState(false);
  const [newProfilePictureFile, setNewProfilePictureFile] = useState(null); // Track uploaded file
  const [originalProfilePicture, setOriginalProfilePicture] = useState(""); // Store original profile picture for undo
  const [loading, setLoading] = useState(false); // For showing loading state
  const [ivsData, setIvsData] = useState(null); // To store the response from IVS API
  const [channelCreated, setChannelCreated] = useState();
  const [isBuyChirpsModalOpen, setIsBuyChirpsModalOpen] = useState(false);
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
          setEditableUsername(userData.username);
          setIsStreaming(userData.isStreaming);
          setCredits(userData?.credits > -1 ? userData?.credits : -1);
          setChannelCreated(userData.channelCreated);
          setProfilePicture(
            userData?.photoUrl || "https://github.com/shadcn.png"
          );
          setEditableProfilePicture(
            userData?.photoUrl || "https://github.com/shadcn.png"
          );
          setOriginalProfilePicture(
            userData?.photoUrl || "https://github.com/shadcn.png"
          );
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
        setEditableProfilePicture(
          data?.photoUrl || "https://github.com/shadcn.png"
        );
        setOriginalProfilePicture(
          data?.photoUrl || "https://github.com/shadcn.png"
        );
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

  const handleImageUpload = async (file) => {
    if (!file) return;
    try {
      const storageRef = ref(storage, `profilePictures/${userId}/${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      setEditableProfilePicture(downloadUrl); // Update the preview in modal
      setChangesMade(true);
    } catch (error) {
      console.error("Error uploading image: ", error);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setNewProfilePictureFile(file);
    handleImageUpload(file); // Upload and update preview
  };

  const handleUndoChanges = () => {
    setEditableProfilePicture(originalProfilePicture); // Revert to original picture
    setNewProfilePictureFile(null); // Reset file input
    setChangesMade(false);
  };

  const handleSaveChanges = async () => {
    const userDocRef = doc(db, "users", userId);

    try {
      await updateDoc(userDocRef, {
        username: editableUsername,
        photoUrl: editableProfilePicture,
      });
      setUsername(editableUsername);
      setProfilePicture(editableProfilePicture);
      setChangesMade(false);
      setIsEditProfileOpen(false);
      setNewProfilePictureFile(null);
    } catch (error) {
      console.error("Error saving changes: ", error);
    }
  };
  //   // Function to call the createIVSChannel API
  const createIVSChannelHandler = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/createIVSChannel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username }), // Assuming you're testing with "Houler"
      });

      if (!response.ok) {
        console.error("Error creating IVS channel:", response.statusText);
        return;
      }

      const data = await response.json();
      setIvsData(data);
      console.log("IVS Channel Created: ", data);
      // After successful channel creation, update Firestore
      const userDocRef = doc(db, "users", userId); // Firestore doc reference for the user

      await updateDoc(userDocRef, {
        serverUrl: data.serverUrl,
        streamKey: data.streamKey,
        streamUrl: data.streamUrl,
        channelCreated: true,
      });
      setChannelCreated(true);
      console.log("User Firestore document updated with IVS channel details");
    } catch (error) {
      console.error("Error calling API:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* TopBar */}
      <header className="flex justify-between items-center p-4 bg-purple-950 text-white">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => {
            router.push(`/`);
          }}
        >
          <Image
            loading="eager"
            src="/houl_darker_svg.svg"
            height={50}
            width={50}
            alt="Houl"
            className="cursor-pointer"
          />
          <p className="text-[2rem] ml-2 lexend-topbarLogo hidden lg:block">
            Houl
          </p>
        </div>

        {/* Right Side - Profile Picture and Go Live/Stop Stream Button */}
        <div className="flex items-center space-x-4">
          {channelCreated ? (
            <BrowserView>
              {isStreaming ? (
                <Button
                  className="bg-red-600 topbar_StreamControlButton"
                  onClick={handleStopStream}
                >
                  Stop Stream
                </Button>
              ) : (
                <Button
                  className="bg-green-600 topbar_StreamControlButton"
                  onClick={handleGoLive}
                >
                  Go Live
                </Button>
              )}
            </BrowserView>
          ) : (
            <BrowserView>
              <Button
                onClick={createIVSChannelHandler}
                // disabled={!user || loading}
                className="bg-blue-600 text-white p-2 rounded topbar_createChannelButton"
              >
                {loading ? "Creating Channel..." : "Create Channel"}
              </Button>
            </BrowserView>
          )}
          {/* Profile Picture */}
          {profilePicture && (
            <Image
              src={profilePicture || "https://github.com/shadcn.png"}
              height={45}
              width={45}
              className="h-12 w-12 rounded-full cursor-pointer topbar_profilePicture"
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
        className="fixed inset-0 z-10 flex items-center justify-center"
      >
        <DialogPanel className="bg-gray-900 flex flex-col gap-1 items-center p-6 absolute lg:right-[4rem] right-[1rem] top-[4rem] rounded-lg text-white lg:w-[20vw] md:w-[30vw] w-[50vw] max-w-md">
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
          <span className="text-center text-[0.95rem]">@{username}</span>
          {/* Credits */}
          <Tooltip.Provider delayDuration={1000}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div
                  className="flex justify-center items-center text-lg cursor-pointer"
                  onClick={() => {
                    setIsBuyChirpsModalOpen(true);
                  }}
                >
                  <span className="mr-2"> {credits}</span>
                  <Image
                    src="/chirpsIcon.png"
                    height={20}
                    width={20}
                    alt="Chirps"
                  />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-gray-400 bg-opacity-55 p-1 rounded z-50 text-sm"
                  sideOffset={5}
                  side="right"
                >
                  Buy more Credits
                  <Tooltip.Arrow className="fill-gray-500 fill-opacity-25 gray-500" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
          {/* Buttons */}
          <div
            className="bg-blue-800 w-[50%] text-center text-[0.8rem] mx-auto rounded my-1 cursor-pointer p-1"
            onClick={() => {
              setIsProfileModalOpen(false);
              setIsEditProfileOpen(true);
            }}
          >
            Edit Profile
          </div>
          <div className="space-y-2">
            <Button className="bg-orange-600 w-full" onClick={handleSignOut}>
              Sign Out <PiSignOutBold className="ml-1" />
            </Button>
          </div>
        </DialogPanel>
      </Dialog>
      {/* Edit Profile Modal */}
      <Dialog
        open={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        className="fixed inset-0 z-20 flex items-center justify-center  bg-gray-800 bg-opacity-90"
      >
        <DialogPanel className="bg-gray-900 p-6 flex items-center flex-col rounded shadow-lg text-white lg:w-[30vw] w-[90vw] max-w-md">
          <h2 className="text-xl mb-4 text-center">Edit Profile</h2>

          {/* Profile Picture */}
          <div>
            <div className="flex flex-col items-center space-x-2 mb-4 relative">
              <Image
                id="profilePictureField"
                src={editableProfilePicture || "https://github.com/shadcn.png"}
                height={100}
                width={100}
                className="h-20 w-20 rounded-full"
                alt="Profile Picture"
              />
              {newProfilePictureFile ? (
                <X
                  className="absolute right-[0.25rem] bottom-0 bg-gray-700 h-6 w-6 rounded-[50%] p-1 cursor-pointer"
                  onClick={handleUndoChanges} // Undo changes
                />
              ) : (
                <>
                  <Upload
                    className="absolute right-0 bottom-0 bg-gray-700 h-6 w-6 rounded-[50%] p-1 cursor-pointer"
                    onClick={() => document.getElementById("fileInput").click()}
                  />
                  <input
                    id="fileInput"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              )}
            </div>
            <p className="text-gray-400 text-left text-[0.9rem] w-full  ">
              Profile Picture
            </p>
          </div>
          {/* Username */}
          <div className="flex flex-col items-center space-x-2 mb-4">
            <p className="text-gray-400 text-left text-[0.9rem] w-full ml-3">
              Username
            </p>
            <input
              id="usernameField"
              type="text"
              value={editableUsername}
              className="bg-gray-700 text-white p-2 rounded w-full"
              onChange={(e) => {
                setEditableUsername(e.target.value);
                setChangesMade(true);
              }}
            />
          </div>

          {/* Save/Close Button */}
          <Button
            className="bg-purple-600 text-white w-full"
            onClick={
              changesMade
                ? handleSaveChanges
                : () => setIsEditProfileOpen(false)
            }
          >
            {changesMade ? "Save Changes" : "Close"}
          </Button>
        </DialogPanel>
      </Dialog>
      {/* Buy Chirps Modal */}
      {isBuyChirpsModalOpen && (
        <BuyChirpsModal
          isOpen={isBuyChirpsModalOpen}
          onClose={() => setIsBuyChirpsModalOpen(false)}
        />
      )}
    </>
  );
};

export default TopBar;
