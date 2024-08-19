"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardCopy, Check, Play } from "lucide-react";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import ReactPlayer from "react-player";

const GoLiveModal = ({ onClose, streamInfo, userId }) => {
  const [serverUrlCopied, setServerUrlCopied] = useState(false);
  const [streamKeyCopied, setStreamKeyCopied] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const videoRef = useRef(null);

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
      setTimeout(() => setServerUrlCopied(false), 2000); // Reset after 2 seconds
    });
  };

  const handleCopyStreamKey = () => {
    navigator.clipboard.writeText(streamKey).then(() => {
      setStreamKeyCopied(true);
      setTimeout(() => setStreamKeyCopied(false), 2000); // Reset after 2 seconds
    });
  };

  const handleStartStream = async () => {
    const userDoc = doc(db, "users", userId);
    await updateDoc(userDoc, {
      isStreaming: true,
    });
    setIsPreviewing(false);
    onClose(); // Close the modal
  };

  const handleStopStream = async () => {
    const userDoc = doc(db, "users", userId);
    await updateDoc(userDoc, {
      isStreaming: false,
    });
    onClose(); // Close the modal
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
                playing={true} // Auto-play the video
                className="react-player"
                config={{
                  file: {
                    attributes: {
                      autoPlay: true, // Ensure autoPlay is set
                    },
                    hlsOptions: {
                      startPosition: -1, // Automatically start at the live edge
                    },
                  },
                }}
              />
            ) : (
              <p>Loading stream...</p>
            )}{" "}
            <div className="flex w-full justify-around">
              <Button className="bg-green-600 mb-4" onClick={handleStartStream}>
                Start Stream
              </Button>
              <Button className="bg-red-600" onClick={handleStopStream}>
                Stop Stream
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoLiveModal;
