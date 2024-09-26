"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardCopy, Check } from "lucide-react";
import {
  doc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import ReactPlayer from "react-player";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dialog, DialogPanel } from "@headlessui/react";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";
import BuyChirpsModal from "./BuyChirpsModal";

const GoLiveModal = ({ onClose, userId, username, setIsStreaming }) => {
  const [serverUrlCopied, setServerUrlCopied] = useState(false);
  const [streamKeyCopied, setStreamKeyCopied] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [streamName, setStreamName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [credits, setCredits] = useState(0);
 const [isBuyChirpsModalOpen, setIsBuyChirpsModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userDoc = doc(db, "users", userId);
    const unsubscribe = onSnapshot(userDoc, (doc) => {
      const userData = doc.data();
      setServerUrl(userData.serverUrl);
      setStreamKey(userData.streamKey);
      setStreamUrl(userData.streamUrl);
      setCredits(userData.credits || 0);
      console.log("user creds", userData.credits);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleCopyServerUrl = () => {
    navigator.clipboard.writeText(serverUrl).then(() => {
      setServerUrlCopied(true);
      setTimeout(() => setServerUrlCopied(false), 2000);
    });
  };

  const handleCopyStreamKey = () => {
    navigator.clipboard.writeText(streamKey).then(() => {
      setStreamKeyCopied(true);
      setTimeout(() => setStreamKeyCopied(false), 2000);
    });
  };

  const handleStartStream = async () => {
    if (credits < 9) return; // Disable button if not enough credits

    if (!streamName.trim()) {
      alert("Please enter a name for your stream.");
      return;
    }

    try {
      // Create a new document in the "streams" collection
      await addDoc(collection(db, "streams"), {
        streamName: streamName,
        author: username,
        streamUrl: streamUrl,
        streamStartedAt: Date.now(),
        likes: 0,
        dislikes: 0,
        chat: [],
      });

      // Deduct 9 credits
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        credits: credits - 9,
        isStreaming: true,
      });

      setIsStreaming(true);
      setIsPreviewing(false);
      router.push(`/stream/${username}`);
      onClose(); // Close the modal
    } catch (error) {
      console.error("Error starting stream:", error);
    }
  };


  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        {!isPreviewing ? (
          <>
            <h2 className="text-xl font-bold mb-4">Go Live</h2>
            <div className="mb-4">
              <label className="block font-medium">
                HLS Server URL for OBS
              </label>
              <div className="flex items-center space-x-2">
                <p className="flex-1 w-full text-sm">{serverUrl}</p>
                <Button
                  className="flex items-center"
                  onClick={handleCopyServerUrl}
                >
                  {serverUrlCopied ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <ClipboardCopy className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block font-medium">
                HLS Stream Key for OBS
              </label>
              <div className="flex items-center space-x-2">
                <p className="flex-1 w-full text-xs">{streamKey}</p>
                <Button
                  className="flex items-center"
                  onClick={handleCopyStreamKey}
                >
                  {streamKeyCopied ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <ClipboardCopy className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex w-full justify-around">
              <Button
                className="bg-green-500"
                onClick={() => setIsPreviewing(true)}
              >
                Preview Stream
              </Button>
              <Button className="bg-red-600" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">Stream Preview</h2>
            {streamUrl ? (
              <ReactPlayer
                playsinline
                controls
                url={streamUrl}
                playing={true}
                className="react-player"
                config={{
                  file: {
                    attributes: { autoPlay: true },
                    hlsOptions: { startPosition: -1 },
                  },
                }}
              />
            ) : (
              <Image
                loading="eager"
                src="/houl_darker_svg.svg"
                className="rotate"
                height={200}
                width={200}
                alt="Houl"
              />
            )}
            <div className="mb-4">
              <label className="block font-medium text-white">
                Stream Name
              </label>
              <input
                type="text"
                value={streamName}
                onChange={(e) => setStreamName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white"
                placeholder="Enter a name for your stream"
              />
            </div>
            <div className="flex w-full justify-around">
              <Button
                className={`mb-4 ${
                  credits < 90
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white"
                }`}
                onClick={handleStartStream}
                disabled={credits < 90}
              >
                {credits < 90 ? "Insufficient Credits" : `Start Stream for x9`}
                {credits > 90 && (
                  <Image
                    src="/chirpsIcon.png"
                    className="inline"
                    height={15}
                    width={15}
                  />
                )}
              </Button>
              {credits < 9 && (
                <Button
                  className="bg-purple-700"
                  onClick={() => {
                    setIsBuyChirpsModalOpen(true);
                    // onClose();
                  }}
                >
                  Buy Credits
                </Button>
              )}
              <Button className="bg-red-600" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Buy Chirps Modal */}

      {isBuyChirpsModalOpen && (
        <BuyChirpsModal
          isOpen={isBuyChirpsModalOpen}
          onClose={() => setIsBuyChirpsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default GoLiveModal;
