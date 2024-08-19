"use client";

import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import ReactPlayer from "react-player";

const StreamGrid = () => {
  const [streams, setStreams] = useState([]);

  useEffect(() => {
    const streamsQuery = query(
      collection(db, "users"),
      where("isStreaming", "==", true)
    );

    const unsubscribe = onSnapshot(streamsQuery, (snapshot) => {
      const streamsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStreams(streamsData);
    });

    return () => unsubscribe();
  }, []);



  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {streams.map((stream) => (
        <div key={stream.id} className="bg-gray-800 p-4 rounded-lg">
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
          <h5 className="text-lg font-bold mb-2">{stream.username}</h5>
        </div>
      ))}
    </div>
  );
};

export default StreamGrid;
