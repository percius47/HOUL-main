"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import ReactPlayer from "react-player";
import { Button } from "@/components/ui/button";
import { AiFillLike, AiOutlineDislike, AiOutlineLike } from "react-icons/ai";
import TopBar from "@/app/Components/Topbar";
import { onAuthStateChanged } from "firebase/auth";
const StreamPage = ({ params }) => {
   const { username } = params;
   const [streamUrl, setStreamUrl] = useState(null);
   const [streamName, setStreamName] = useState("");
   const [chatMessages, setChatMessages] = useState([]);
   const [subscribers, setSubscribers] = useState(0);
   const [likes, setLikes] = useState(0);
   const [user, setUser] = useState(null);

   useEffect(() => {
     // Monitor user authentication status
     const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
       if (currentUser) {
         setUser(currentUser);
       } else {
         setUser(null);
       }
     });

     return () => unsubscribeAuth();
   }, []);

   useEffect(() => {
     if (!username) return;

     // Fetch stream data
     const streamsQuery = query(
       collection(db, "streams"),
       where("author", "==", username)
     );

     const unsubscribe = onSnapshot(streamsQuery, (snapshot) => {
       if (!snapshot.empty) {
         const streamData = snapshot.docs[0].data();
         setStreamUrl(streamData.streamUrl);
         setStreamName(streamData.streamName);
         setLikes(streamData.likes);
       }
     });

     return () => unsubscribe();
   }, [username]);

   useEffect(() => {
     if (!username) return;

     // Fetch subscriber count from users collection
     const fetchSubscribers = async () => {
       const userDocRef = doc(db, "users", username);
       const userDoc = await getDoc(userDocRef);
       if (userDoc.exists()) {
         const userData = userDoc.data();
         setSubscribers(userData.subscribers || 0);
       }
     };

     fetchSubscribers();
   }, [username]);

   if (!user) {
     return <p>Loading...</p>; // Handle the case where user data is not yet available
   }

  return (
    <>
      <TopBar username={user.email} userId={user.uid} />
      <div className="flex flex-col lg:flex-row p-4 h-screen justify-between bg-gray-900">
        <div className="w-full lg:w-[70%] ">
          {streamUrl ? (
            <div>
              <ReactPlayer
                url={streamUrl}
                playing={true}
                controls
                className="react-player"
                width="100%"
                height="100%"
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
              />{" "}
              <h2 className="text-4xl font-bold text-white ml-4">
                {streamName}
              </h2>
              <div className="flex justify-between w-[70%]">
                <div className="ml-4 my-2">
                  <h2 className="text-2xl font-bold text-gray-400 ">
                    {username}
                  </h2>
                  <span className="text-lg  text-gray-500">
                    {subscribers} Subscribers
                  </span>
                </div>
                <div className="flex items-center justify-between w-[15%] mx-4 ">
                  <Button className="bg-gray-200 px-2">
                    {likes}
                    <AiOutlineLike />
                  </Button>
                  <Button className="bg-gray-200 px-2">
                    <AiOutlineDislike />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-white">Loading stream...</p>
          )}
        </div>
        {/* chat section */}
        <div className="w-full lg:w-[30%]  p-4 bg-gray-800 overflow-y-auto rounded-t-lg">
          <h2 className="text-xl font-bold text-white">Live Chat</h2>
          <div className="mt-4">
            {/* Chat messages will go here */}
            {chatMessages.length > 0 ? (
              chatMessages.map((msg, index) => (
                <div key={index} className="text-white mb-2">
                  <p>
                    <strong>{msg.username}</strong>: {msg.message}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No messages yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};  

export default StreamPage;
