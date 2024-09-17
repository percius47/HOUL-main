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
import { MdDelete } from "react-icons/md";
import TopBar from "@/app/Components/Topbar";
import { onAuthStateChanged } from "firebase/auth";
import CustomAvatar from "@/app/Components/CustomAvatar";
import Image from "next/image";

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
  const [messageInput, setMessageInput] = useState(""); // New state for chat input
  const [viewerUsername, setViewerUsername] = useState(null);

  useEffect(() => {
    // Monitor user authentication status
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch viewer's username after setting the user
        await fetchViewerUsername(currentUser.uid);
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
        setStreamTime(streamData.streamStartedAt);
        setLikes(streamData.likes);
        setDislikes(streamData.dislikes || 0);
        setHasLiked(streamData.likedBy?.includes(user?.uid));
        setHasDisliked(streamData.dislikedBy?.includes(user?.uid));
        setChatMessages(streamData.chat || []);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [username, user]);

  useEffect(() => {
    if (!streamTime) return;

    const calculateTimeElapsed = () => {
      const diff = Date.now() - streamTime;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeElapsed(
        `${hours > 0 ? hours + "h " : ""}${minutes > 0 ? minutes + "m " : ""}
        ${seconds > 0 ? seconds + "s ago" : "now"}`
      );
    };

    calculateTimeElapsed();
    const intervalId = setInterval(calculateTimeElapsed, 300000);

    return () => clearInterval(intervalId);
  }, [streamTime]);
  // Fetch viewer username
  const fetchViewerUsername = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setViewerUsername(userDoc.data().username); // Correctly set the viewer's username
      }
    } catch (error) {
      console.error("Error fetching viewer username:", error);
    }
  };

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

  // Function to handle sending a chat message
  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    const streamsQuery = query(
      collection(db, "streams"),
      where("author", "==", username)
    );

    const streamSnapshot = await getDocs(streamsQuery);

    if (!streamSnapshot.empty) {
      const streamDocRef = streamSnapshot.docs[0].ref;

      // Fetch the user's username from the "users" collection
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const chatAuthor = userDoc.exists()
        ? userDoc.data().username
        : "Anonymous";

      const newMessage = {
        chatAuthor: chatAuthor,
        message: messageInput,
        chatTimestamp: new Date(),
        photoUrl: user.photoURL || "https://github.com/shadcn.png",
      };

      await updateDoc(streamDocRef, {
        chat: arrayUnion(newMessage),
      });

      setMessageInput("");
    }
  };
  //delete sent messages
  const handleDeleteMessage = async (messageToDelete) => {
    try {
      const streamsQuery = query(
        collection(db, "streams"),
        where("author", "==", username)
      );

      const streamSnapshot = await getDocs(streamsQuery);

      if (!streamSnapshot.empty) {
        const streamDocRef = streamSnapshot.docs[0].ref;

        // Remove the selected message from Firestore
        await updateDoc(streamDocRef, {
          chat: arrayRemove(messageToDelete),
        });

        // Update local state after deletion
        setChatMessages((prevMessages) =>
          prevMessages.filter(
            (msg) => msg.chatTimestamp !== messageToDelete.chatTimestamp
          )
        );
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp.seconds * 1000);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };
  // loggg
  console.log(
    "---chatmessage author, viewerUsername,streamer",
    chatMessages[0]?.chatAuthor,
    viewerUsername,
    username,
    chatMessages[0]?.chatAuthor === viewerUsername,
    viewerUsername === username
  );
  if (!user) {
    return (
      <Image
        loading="eager"
        src="/houlSvg.svg"
        className="rotate"
        height={200}
        width={200}
        alt="Houl"
      />
    );
  }

  return (
    <>
      <TopBar username={user.email} userId={user.uid} />
      <div className="flex flex-col lg:flex-row p-4 justify-between bg-gray-900 h-max">
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
              <h2 className="text-2xl sm:text-3xl md:text-4xl  font-bold text-white mt-2">
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
                {/* show only if the viewer is not author */}
              {viewerUsername!==username && <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  <Button
                    onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                    className={`${isSubscribed ? "bg-red-500" : "bg-blue-500"}`}
                  >
                    {isSubscribed ? "Unsubscribe" : "Subscribe"}
                  </Button>
                  <Button
                    onClick={handleLike}
                    className={`bg-gray-200 px-2 ${
                      hasLiked ? "text-green-700" : ""
                    }`}
                  >
                    {likes}
                    {hasLiked ? (
                      <AiFillLike className="ml-1" />
                    ) : (
                      <AiOutlineLike className="ml-1" />
                    )}
                  </Button>
                  <Button
                    onClick={handleDislike}
                    className={`bg-gray-200 px-2 ${
                      hasDisliked ? "text-red-500" : ""
                    }`}
                  >
                    {dislikes}
                    {hasDisliked ? (
                      <AiFillDislike className="ml-1" />
                    ) : (
                      <AiOutlineDislike className="ml-1" />
                    )}
                  </Button>
                </div>}
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
        <div className="w-full lg:w-[30%] pt-4 bg-gray-800 flex flex-col h-[85vh] overflow-hidden rounded-t-lg rounded-b-md relative">
          <h2 className="text-xl font-bold text-white ml-2">Live Chat</h2>
          {/* Chat messages container */}
          <div
            className="flex-grow mt-4 space-y-4 overflow-y-auto pr-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style jsx>{`
              ::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            {/* Chat messages display */}
            {chatMessages.length > 0 ? (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className="flex justify-between space-x-2 pl-2 hover:bg-gray-900 pt-1 group"
                >
                  <div className="w-[80%] flex ">
                    <CustomAvatar
                      className="inline"
                      src={msg.photoUrl}
                      alt={msg.chatAuthor}
                      fallbackSrc={"https://github.com/shadcn.png"}
                    />
                    <div className="text-white ml-[5%]">
                      <p>
                        <strong>{msg.chatAuthor}</strong>: {msg.message}
                      </p>
                      <span className="text-xs text-gray-400">
                        {formatTimestamp(msg.chatTimestamp)}
                      </span>
                    </div>
                  </div>
                  {(msg.chatAuthor === viewerUsername ||
                    username === viewerUsername) && (
                    <button
                      className="text-red-500 text-xl invisible group-hover:visible"
                      onClick={() => handleDeleteMessage(msg)}
                    >
                      <MdDelete className="text-red-900 items-center mr-3" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 ml-2">No messages yet.</p>
            )}
          </div>
          {/* Chat input field and send button */}
          <div className="flex items-center w-full bg-purple-700 pl-1 py-1">
            <CustomAvatar
              className="inline"
              src={user.photoURL}
              alt={user.chatAuthor}
              fallbackSrc={"https://github.com/shadcn.png"}
            />
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-grow px-2 rounded-l bg-transparent text-white focus-within:border-transparent outline-none w-[60%]"
            />
            <Button
              // variant="houl"
              onClick={handleSendMessage}
              className="bg-purple-950 text-white  mr-1 p-4"
            >
              Houl
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StreamPage;
