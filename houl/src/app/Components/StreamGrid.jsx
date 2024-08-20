"use client";

import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import ReactPlayer from "react-player";
import { useRouter } from "next/navigation";

const StreamGrid = () => {
  const [streams, setStreams] = useState([]);
  const [timeElapsed, setTimeElapsed] = useState({});
 const router = useRouter();
  useEffect(() => {
    // Query the "streams" collection to get all active streams
    const streamsQuery = collection(db, "streams");

    const unsubscribe = onSnapshot(streamsQuery, (snapshot) => {
      const streamsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStreams(streamsData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const calculateTimeElapsed = () => {
      const currentTimes = {};

      streams.forEach((stream) => {
        const timeDifference =
          Date.now() - stream.streamStartedAt;
        const minutes = Math.floor(timeDifference / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (minutes < 2) {
          currentTimes[stream.id] = "Started now";
        } else if (hours > 0) {
          currentTimes[
            stream.id
          ] = `Started ${hours} hr ${remainingMinutes} min ago`;
        } else {
          currentTimes[stream.id] = `Started ${remainingMinutes} min ago`;
        }
      });
      setTimeElapsed(currentTimes);
    };

    // Calculate the time immediately and then every 2 minutes
    calculateTimeElapsed();
    const intervalId = setInterval(calculateTimeElapsed, 2000);

    return () => clearInterval(intervalId);
  }, [streams]);


  const handleStreamClick = (username) => {
    router.push(`/stream/${username}`);
  };

  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {streams.length > 0 ? (
        streams.map((stream) => (
          <div
            key={stream.id}
            className="bg-gray-800 p-4 rounded-lg cursor-pointer"
            onClick={() => handleStreamClick(stream.author)}
          >
            <ReactPlayer
              playsinline
              controls
              url={stream.streamUrl}
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
            <h5 className="text-lg font-bold mb-2 text-white">
              {stream.streamName}
            </h5>
            <p className="text-sm text-gray-400">Author: {stream.author}</p>
            <p className="text-sm text-gray-400">
              {timeElapsed[stream.id] || "Calculating..."}
            </p>
          </div>
        ))
      ) : (
        <p className="text-white">No active streams available.</p>
      )}
    </div>
  );
};

export default StreamGrid;
