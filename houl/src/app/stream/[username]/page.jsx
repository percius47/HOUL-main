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
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
} from "firebase/firestore";
import ReactPlayer from "react-player";
import { Button } from "@/components/ui/button";
import {
  AiOutlineLike,
  AiOutlineDislike,
  AiFillLike,
  AiFillDislike,
} from "react-icons/ai";
import TopBar from "@/app/Components/Topbar";
import { onAuthStateChanged } from "firebase/auth";
import CustomAvatar from "@/app/Components/CustomAvatar";

const StreamPage = ({ params }) => {
  const { username } = params;
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamName, setStreamName] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [subscribers, setSubscribers] = useState(0);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [user, setUser] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [authorId, setAuthorId] = useState(null);
  const [creatorAvatar, setCreatorAvatar] = useState(null);
  const [streamTime, setStreamTime] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState("");

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
        setStreamTime(streamData.streamStartedAt); // Convert Firestore Timestamp to JS Date
        setLikes(streamData.likes); // Ensure likes are updated in real-time
        setDislikes(streamData.dislikes || 0); // Ensure dislikes are updated in real-time
        setHasLiked(streamData.likedBy?.includes(user?.uid)); // Update hasLiked state
        setHasDisliked(streamData.dislikedBy?.includes(user?.uid)); // Update hasDisliked state
      }
    });

    return () => {
      unsubscribe();
    };
  }, [username, user]); // Add 'user' as dependency to re-trigger the listener when user changes

  useEffect(() => {
    if (!streamTime) return;

    const calculateTimeElapsed = () => {
      const diff = Date.now() - streamTime; // Difference in milliseconds
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeElapsed(
        `${hours > 0 ? hours + "h " : ""}${minutes > 0 ? minutes + "m " : ""}
        ${seconds > 0 ? seconds + "s ago" : "now"}`
      );
    };

    calculateTimeElapsed(); // Initial call to set the time right away
    const intervalId = setInterval(calculateTimeElapsed, 300000); // Update every second

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [streamTime]);

  const fetchAuthorUid = async () => {
    try {
      // Query the "users" collection to find the user with the given username
      const usersQuery = query(
        collection(db, "users"),
        where("username", "==", username)
      );

      const querySnapshot = await getDocs(usersQuery);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        console.log("author uid", userDoc.id);

        return userDoc.id;
      } else {
        console.log("No user found with the provided username.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching author UID:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!username || !user) return;

    const fetchUserData = async () => {
      const authorUid = await fetchAuthorUid(username);
      setAuthorId(authorUid);
      console.log("author uid", authorUid);

      const userDocRef = doc(db, "users", authorUid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log(
          "creator subs data",
          userData.username,
          userData.subscribers,
          authorUid
        );
        setCreatorAvatar(userData.photoUrl);
        setSubscribers(userData.subscribers?.length || 0);
        setIsSubscribed(
          Array.isArray(userData.subscribers)
            ? userData.subscribers.includes(user.uid)
            : false
        );
      }
    };

    fetchUserData();
  }, [username, user]);

  const handleSubscribe = async () => {
    const userDocRef = doc(db, "users", authorId);

    try {
      await updateDoc(userDocRef, {
        subscribers: arrayUnion(user.uid),
      });
      setSubscribers(subscribers + 1 || 0);
      setIsSubscribed(true);
    } catch (error) {
      console.error("Error subscribing:", error);
    }
  };

  const handleUnsubscribe = async () => {
    const userDocRef = doc(db, "users", authorId);

    try {
      await updateDoc(userDocRef, {
        subscribers: arrayRemove(user.uid),
      });
      setSubscribers(subscribers - 1 || 0);
      setIsSubscribed(false);
    } catch (error) {
      console.error("Error unsubscribing:", error);
    }
  };

  const handleLike = async () => {
    const streamsQuery = query(
      collection(db, "streams"),
      where("author", "==", username)
    );

    const streamSnapshot = await getDocs(streamsQuery);
    if (!streamSnapshot.empty) {
      const streamDocRef = streamSnapshot.docs[0].ref;
      const updateAction = hasLiked
        ? arrayRemove(user.uid)
        : arrayUnion(user.uid);

      await updateDoc(streamDocRef, {
        likedBy: updateAction,
        likes: hasLiked ? likes - 1 : likes + 1,
      });
    }
  };

  const handleDislike = async () => {
    const streamsQuery = query(
      collection(db, "streams"),
      where("author", "==", username)
    );

    const streamSnapshot = await getDocs(streamsQuery);
    if (!streamSnapshot.empty) {
      const streamDocRef = streamSnapshot.docs[0].ref;
      const updateAction = hasDisliked
        ? arrayRemove(user.uid)
        : arrayUnion(user.uid);

      await updateDoc(streamDocRef, {
        dislikedBy: updateAction,
        dislikes: hasDisliked ? dislikes - 1 : dislikes + 1,
      });
    }
  };

  if (!user) {
    return <p>Loading...user not found</p>;
  }

  return (
    <>
      <TopBar username={user.email} userId={user.uid} />
      <div className="flex flex-col lg:flex-row p-4 h-screen justify-between bg-gray-900">
        <div className="w-full lg:w-[70%] mb-4 lg:mb-0 lg:pr-4">
          {streamUrl ? (
            <div className="relative">
              <ReactPlayer
                url={streamUrl}
                playing={true}
                controls
                className="react-player"
                width="100%"
                height="auto"
                style={{ maxHeight: "75vh" }}
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
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mt-2">
                {streamName}
              </h2>
              <div className="flex flex-col sm:flex-row justify-between w-full mt-2">
                <div className="flex items-center">
                  <CustomAvatar
                    className="inline"
                    src={creatorAvatar}
                    alt={"username"}
                    fallbackSrc={"https://github.com/shadcn.png"}
                  />
                  <div className="ml-3">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-400">
                      {username}
                    </h2>
                    <span className="text-sm sm:text-md text-gray-500">
                      {subscribers} Subscribers
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  <Button
                    onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                    className={`${isSubscribed ? "bg-red-500" : "bg-blue-500"}`}
                  >
                    {isSubscribed ? "Unsubscribe" : "Subscribe"}
                  </Button>
                  <Button
                    onClick={handleLike}
                    className={`bg-gray-200 px-2 ${
                      hasLiked ? "text-green-500" : ""
                    }`}
                  >
                    {likes}
                    {hasLiked ? <AiFillLike /> : <AiOutlineLike />}
                  </Button>
                  <Button
                    onClick={handleDislike}
                    className={`bg-gray-200 px-2 ${
                      hasDisliked ? "text-red-500" : ""
                    }`}
                  >
                    {dislikes}
                    {hasDisliked ? <AiFillDislike /> : <AiOutlineDislike />}
                  </Button>
                </div>
              </div>
              <span className="text-sm sm:text-lg text-gray-500 mt-2">
                Started {timeElapsed}
              </span>
            </div>
          ) : (
            <p className="text-white">Loading stream...</p>
          )}
        </div>
        {/* chat section */}
        <div className="w-full lg:w-[30%] p-4 bg-gray-800 overflow-y-auto rounded-t-lg">
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
