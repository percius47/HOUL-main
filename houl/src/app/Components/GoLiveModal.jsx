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
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import ReactPlayer from "react-player";

const GoLiveModal = ({ onClose, userId, username, setIsStreaming }) => {
  const [serverUrlCopied, setServerUrlCopied] = useState(false);
  const [streamKeyCopied, setStreamKeyCopied] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [streamName, setStreamName] = useState("");

  const serverUrl = "rtmp://13.234.177.100:1935/houl1/live1";
  const streamKey = "live1";

  useEffect(() => {
    if (isPreviewing) {
      const userDoc = doc(db, "users", userId);
      const unsubscribe = onSnapshot(userDoc, (doc) => {
        setStreamUrl(doc.data().streamUrl);
      });

      return () => unsubscribe();
    }
  }, [isPreviewing, userId]);

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
        chat: [],
      });

      // Update the isStreaming field in the user's document
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { isStreaming: true });

      setIsStreaming(true);
      setIsPreviewing(false);
      onClose(); // Close the modal
    } catch (error) {
      console.error("Error starting stream:", error);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        {!isPreviewing ? (
          <>
            <h2 className="text-xl font-bold mb-4">Go Live</h2>
            <div className="mb-4">
              <label className="block font-medium">
                HLS Server URL for OBS
              </label>
              <div className="flex items-center space-x-2">
                <p className="flex-1">{serverUrl}</p>
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
                <p className="flex-1">{streamKey}</p>
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
                    attributes: {
                      autoPlay: true,
                    },
                    hlsOptions: {
                      startPosition: -1,
                    },
                  },
                }}
              />
            ) : (
              <p>Loading stream...</p>
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
              <Button className="bg-green-600 mb-4" onClick={handleStartStream}>
                Start Stream
              </Button>
              <Button className="bg-red-600" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoLiveModal;
