"use client";

import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import ReactPlayer from "react-player";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserIcon } from "lucide-react";

const StreamGrid = () => {
  const [streams, setStreams] = useState([]);
  const [timeElapsed, setTimeElapsed] = useState({});
  const [loading, setLoading] = useState(true); // Loading state
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
      setLoading(false); // Stop loading once data is fetched
    });

    return () => unsubscribe();
  }, []);

useEffect(() => {
  const calculateTimeElapsed = () => {
    const currentTimes = {};

    streams.forEach((stream) => {
      const timeDifference = Date.now() - stream.streamStartedAt;
      const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor(
        (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
      );

      if (minutes < 2 && hours === 0 && days === 0) {
        currentTimes[stream.id] = "Started now";
      } else if (days > 0) {
        currentTimes[stream.id] = `Started ${days}d ${hours}h ${minutes}m ago`;
      } else if (hours > 0) {
        currentTimes[stream.id] = `Started ${hours}h ${minutes}m ago`;
      } else {
        currentTimes[stream.id] = `Started ${minutes}m ago`;
      }
    });

    setTimeElapsed(currentTimes);
  };

  // Calculate the time immediately and then every 2 minutes
  calculateTimeElapsed();
  const intervalId = setInterval(calculateTimeElapsed, 120000); // Update every 2 minutes

  return () => clearInterval(intervalId);
}, [streams]);


  const handleStreamClick = (username) => {
    router.push(`/stream/${username}`);
  };

  return (
    <div className="relative min-h-screen">
      {loading ? (
        // Show loader while loading
        <div className="flex justify-center items-center h-screen">
          <Image
            loading="eager"
            src="/houl_darker_svg.svg"
            className="rotate"
            height={200}
            width={200}
            alt="Houl"
          />
        </div>
      ) : streams.length > 0 ? (
        // Show streams after loading is complete
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 stream_grid">
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="bg-gray-800 p-4 rounded-lg cursor-pointer"
              onClick={() => handleStreamClick(stream.author)}
            >
              {stream.type == "demo" ? (
                <iframe
                  className="max-w-[95%] w-[373px] h-[209px] mx-auto mb-1 "
                  // width="90%"
                  // height="auto"
                  src={`${stream.streamUrl}&mute=1&controls=0&rel=0`}
                  muted
                  title="Houl Test Stream"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allowfullscreen
                ></iframe>
              ) : (
                <ReactPlayer
                  playsinline={true}  
                  muted={true}
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
              )}
              <div className="flex w-full justify-between">
                {" "}
                <h5 className="text-lg font-bold mb-2 text-white">
                  {stream.streamName}
                </h5>
                {/* Viewer count */}
                <span className="txt-[1rem] flex justify-between items-center sm:text-md text-red-500 ml-2">
                  {stream?.viewers?.length || 0}
                  <UserIcon
                    className="text-red-400 inline fill-red-500 mx-1"
                    height={12}
                    width={12}
                  />
                </span>
              </div>
              <p className="text-sm text-gray-400">Author: {stream.author}</p>
              <p className="text-sm text-gray-400">
                {timeElapsed[stream.id] || "Calculating..."}
              </p>
            </div>
          ))}
        </div>
      ) : (
        // No active streams available - center this content in the middle of the screen
        <div className="absolute inset-0 flex flex-col justify-center items-center">
          <Image
            loading="eager"
            src="/houl_darker_svg.svg"
            height={200}
            width={200}
            alt="Houl"
          />
          <p className="text-white mt-4">No active streams available.</p>
        </div>
      )}
    </div>
  );
};

export default StreamGrid;
