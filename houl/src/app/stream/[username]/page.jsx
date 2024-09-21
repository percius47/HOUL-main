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
import toast, { Toaster } from "react-hot-toast"; // Import toast for notifications
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { CoinsIcon, HeartCrack } from "lucide-react"; // Chirps Icon
import Script from "next/script";
import { HeartFilledIcon } from "@radix-ui/react-icons";

const StreamPage = ({ params }) => {
  const { username } = params;
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamName, setStreamName] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [subscribers, setSubscribers] = useState(0);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [user, setUser] = useState(null);
  const [viewerCredits, setViewerCredits] = useState(0); // Store viewer's credits
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [authorId, setAuthorId] = useState(null);
  const [creatorAvatar, setCreatorAvatar] = useState("");
  const [streamTime, setStreamTime] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState("");
  const [messageInput, setMessageInput] = useState(""); // New state for chat input
  const [viewerUsername, setViewerUsername] = useState(null);
  const [isChirpsModalOpen, setIsChirpsModalOpen] = useState(false);
  const [chirpsAmount, setChirpsAmount] = useState(5); // Number of chirps to send
  const [chirpsMessage, setChirpsMessage] = useState(""); // Message accompanying chirps
  const [isBuyChirpsModalOpen, setIsBuyChirpsModalOpen] = useState(false); // Modal for buying chirps
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);

  useEffect(() => {
    // Monitor user authentication status
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch viewer's username and credits after setting the user
        await fetchViewerData(currentUser.uid);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const fetchViewerData = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setViewerUsername(data.username); // Set the viewer's username
        setViewerCredits(data.credits || 0); // Set the viewer's credits (default 0)
      }
    } catch (error) {
      console.error("Error fetching viewer data:", error);
    }
  };

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

  const fetchAuthorUid = async () => {
    try {
      const usersQuery = query(
        collection(db, "users"),
        where("username", "==", username)
      );

      const querySnapshot = await getDocs(usersQuery);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
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
      //fetching streamer data
      const authorUid = await fetchAuthorUid(username);
      setAuthorId(authorUid);

      const userDocRef = doc(db, "users", authorUid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // console.log("streamer data", userData);

        setCreatorAvatar(userData.photoUrl);
        setFollowers(userData.followers?.length || 0); // Set followers count
        setIsFollowing(
          Array.isArray(userData.followers)
            ? userData.followers.includes(user.uid)
            : false
        );
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

  //follow/unfollow logic
  const handleFollow = async () => {
    const userDocRef = doc(db, "users", authorId);

    try {
      await updateDoc(userDocRef, {
        followers: arrayUnion(user.uid),
      });

      setFollowers(followers + 1); // Update local state
      setIsFollowing(true); // Set following status to true
      toast.success(`You started following ${username}`, {
        position: "bottom-center",
      });
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Failed to follow. Please try again.");
    }
  };

  const handleUnfollow = async () => {
    const userDocRef = doc(db, "users", authorId);

    try {
      await updateDoc(userDocRef, {
        followers: arrayRemove(user.uid),
      });

      setFollowers(followers - 1); // Update local state
      setIsFollowing(false); // Set following status to false
      toast.success(`You unfollowed ${username}`, {
        position: "bottom-center",
      });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow. Please try again.");
    }
  };

  // Handle subscribe logic
  const handleSubscribe = async () => {
    if (viewerCredits < 25) {
      toast.error(`Get more credits to subscribe to ${username}`, {
        position: "bottom-center",
      });
      return;
    }

    const userDocRef = doc(db, "users", authorId);
    const viewerDocRef = doc(db, "users", user.uid);

    try {
      await updateDoc(userDocRef, {
        subscribers: arrayUnion(user.uid),
      });

      // Deduct 25 credits from the viewer
      await updateDoc(viewerDocRef, {
        credits: viewerCredits - 25,
      });

      setSubscribers(subscribers + 1 || 0);
      setIsSubscribed(true);
      setViewerCredits(viewerCredits - 25); // Update credits in state

      toast.success(`Subscribed successfully to ${username} for 1 month!`, {
        position: "bottom-center",
      });
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

  // Handle sending chirps modal logic
  const handleSendChirps = async () => {
    if (viewerCredits < chirpsAmount) {
      toast.error(
        `You don't have enough credits to send ${chirpsAmount} chirps`,
        {
          position: "bottom-center",
        }
      );
      return;
    }

    const viewerDocRef = doc(db, "users", user.uid);

    try {
      // Deduct chirps (credits) from the viewer
      await updateDoc(viewerDocRef, {
        credits: viewerCredits - chirpsAmount,
      });

      setViewerCredits(viewerCredits - chirpsAmount);
      if (chirpsMessage.length > 0) {
        handleSendMessage("chirp", chirpsAmount);
      }
      // Show chirps message to everyone
      setIsChirpsModalOpen(false);
      toast.success(`You chirped x${chirpsAmount}!`, {
        position: "bottom-center",
      });

      // Show big modal for all viewers
      setTimeout(() => {
        toast(
          `${
            chirpsMessage.length > 0
              ? `${chirpsMessage} x${chirpsAmount}chirps!`
              : `🎉 ${viewerUsername} sent ${chirpsAmount} chirps!`
          }`,
          {
            duration: 3000,
            position: "center",
            style: {
              backgroundColor: "#f59e0b",
              color: "#fff",
              padding: "3rem",
              position: "absolute",
              right: "0",
              left: "0",
              top: "0",
              bottom: "0",
              margin: "auto",
            },
          }
        );
      }, 1000);
      setChirpsMessage("");
    } catch (error) {
      console.error("Error sending chirps:", error);
    }
  };

  const handleSendMessage = async (messageType, chirpAmount) => {
    if (!messageInput.trim()) return;

    const streamsQuery = query(
      collection(db, "streams"),
      where("author", "==", username)
    );

    const streamSnapshot = await getDocs(streamsQuery);

    if (!streamSnapshot.empty) {
      const streamDocRef = streamSnapshot.docs[0].ref;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const chatAuthor = userDoc.exists()
        ? userDoc.data().username
        : "Anonymous";

      const newMessage = {
        chatAuthor: chatAuthor,
        message: messageInput,
        chatTimestamp: new Date(),
        messageType: messageType === "chirp" ? "chirp" : "normal",
        chirpAmount: messageType === "chirp" ? `${chirpAmount}` : 0,
        // photoUrl: user.photoUrl || "https://github.com/shadcn.png",
      };

      await updateDoc(streamDocRef, {
        chat: arrayUnion(newMessage),
      });

      setMessageInput("");
    }
  };

  const handleDeleteMessage = async (messageToDelete) => {
    try {
      const streamsQuery = query(
        collection(db, "streams"),
        where("author", "==", username)
      );

      const streamSnapshot = await getDocs(streamsQuery);

      if (!streamSnapshot.empty) {
        const streamDocRef = streamSnapshot.docs[0].ref;

        await updateDoc(streamDocRef, {
          chat: arrayRemove(messageToDelete),
        });

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

  const openBuyChirpsModal = () => {
    setIsBuyChirpsModalOpen(true);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };
  const handleBuyChirps1 = async (chirps, amount) => {
    const razorpayLoaded = await loadRazorpayScript(); // if (!razorpayLoaded) {
    if (!razorpayLoaded) {
      toast.error("Failed to load Razorpay SDK. Please try again.", {
        position: "bottom-center",
      });
      return;
    }

    try {
      // Create Razorpay order
      console.log("amount in page", amount);

      const response = await fetch("/api/razorpay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // This tells the server to expect JSON
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      // if (!data.orderId) {
      //   toast.error("Failed to create Razorpay order. Please try again.", {
      //     position: "bottom-center",
      //   });
      //   return;
      // }

      const options = {
        key: process.env.RAZORPAY_KEY_ID, // Replace with your Razorpay Key ID
        amount: 100 * 100, // Amount in paisa
        currency: "INR",
        name: "Chirps Purchase",
        description: `Purchase ${chirps} Chirps`,
        order_id: data.orderId,
        handler: async function (response) {
          // Payment successful, now update the user's chirps
          console.log("Payment successful!");

          // try {
          //   const viewerDocRef = doc(db, "users", user.uid);

          //   // Add the purchased chirps to the user's current credits
          //   await updateDoc(viewerDocRef, {
          //     credits: viewerCredits + chirps,
          //   });

          //   // Update local state with new credits
          //   setViewerCredits(viewerCredits + chirps);

          //   // Close the Buy Chirps modal
          //   setIsBuyChirpsModalOpen(false);

          //   // Show a success toast
          //   toast.success(`You successfully bought ${chirps} chirps!`, {
          //     position: "bottom-center",
          //   });
          // } catch (error) {
          //   console.error("Error adding chirps:", error);
          //   toast.error(
          //     "Failed to update chirps after payment. Please contact support.",
          //     {
          //       position: "bottom-center",
          //     }
          //   );
          // }
        },
        prefill: {
          name: user.displayName,
          email: user.email,
        },
        theme: {
          color: "#f59e0b",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Payment Failed", error);
    }
  };
  const handleBuyChirps = async (chirps, amount) => {
    const razorpayLoaded = await loadRazorpayScript();

    if (!razorpayLoaded) {
      toast.error("Failed to load Razorpay SDK. Please try again.", {
        position: "bottom-center",
      });
      return;
    }
    try {
      // Create Razorpay order
      const response = await fetch("/api/razorpay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!data.orderId) {
        toast.error("Failed to create Razorpay order. Please try again.", {
          position: "bottom-center",
        });
        return;
      }

      const options = {
        key: process.env.RAZORPAY_KEY_ID, // Replace with your Razorpay Key ID
        amount: amount * 100, // Amount in paisa
        currency: "INR",
        name: "Chirps Purchase",
        description: `Purchase ${chirps} Chirps`,
        order_id: data.orderId,
        handler: async function (response) {
          console.log("Payment Successful");

          // Payment successful, now update the user's chirps
          try {
            const viewerDocRef = doc(db, "users", user.uid);

            // Add the purchased chirps to the user's current credits
            await updateDoc(viewerDocRef, {
              credits: viewerCredits + chirps,
            });

            // Update local state with new credits
            setViewerCredits(viewerCredits + chirps);

            // Close the Buy Chirps modal
            setIsBuyChirpsModalOpen(false);

            // Show a success toast
            toast.success(`You successfully bought ${chirps} chirps!`, {
              position: "bottom-center",
            });
          } catch (error) {
            console.error("Error adding chirps:", error);
            toast.error(
              "Failed to update chirps after payment. Please contact support.",
              {
                position: "bottom-center",
              }
            );
          }
        },
        prefill: {
          name: user.displayName,
          email: user.email,
        },
        theme: {
          color: "#f59e0b",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Payment Failed", error);
    }
  };
  if (!user) {
    return (
      <Image
        loading="eager"
        src="/houl_darker_svg.svg"
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
      <Toaster
        toastOptions={{
          success: {
            style: {
              background: "#06b500",
            },
          },
          error: {
            style: {
              background: "#d51e1e",
              bottom: 0,
            },
          },
        }}
      />
      <div className="flex flex-col lg:flex-row p-4 justify-between bg-gray-900 h-max">
        <div className="w-full lg:w-[70%] mb-4 lg:mb-0 lg:pr-4 relative">
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
                  <div className="relative">
                    <Image
                      src={creatorAvatar || "https://github.com/shadcn.png"}
                      height={50}
                      width={50}
                      alt="Creator Avatar"
                      className="h-10 w-10 rounded-[50%]"
                    />
                    <span className="bg-red-700 rounded-[0.125rem] px-[2px]  left-0 right-0 mx-auto w-[70%] text-center top-[30px] absolute text-[0.6rem]">
                      LIVE
                    </span>
                  </div>
                  {/* <CustomAvatar
                    className="inline cursor-pointer"
                    src={creatorAvatar}
                    alt={"username"}
                    fallbackSrc={"https://github.com/shadcn.png"} 
                  /> */}
                  <div className="ml-3">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-400 cursor-pointer">
                      {username}
                    </h2>
                    <span className="text-sm sm:text-md text-gray-500">
                      {subscribers} Subscribers
                    </span>
                  </div>
                </div>

                {viewerUsername !== username && (
                  <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                    {/* Follow button */}
                    <div
                      onClick={isFollowing ? handleUnfollow : handleFollow}
                      className={`rounded flex bg-purple-700 items-center p-1 cursor-pointer ${
                        isFollowing ? "bg-gray-500" : "bg-blue-500"
                      }`}
                    >
                      {isFollowing ? <HeartCrack /> : <HeartFilledIcon />}
                      <span className="mx-1">
                        {isFollowing ? "Unfollow" : "Follow"}
                      </span>
                    </div>
                    <div
                      className={`flex rounded pl-2  items-center text-white cursor-pointer ${
                        isSubscribed ? "bg-green-600" : "bg-purple-500 "
                      }`}
                      onClick={
                        isSubscribed ? handleUnsubscribe : handleSubscribe
                      }
                    >
                      <span className="pr-1 py-1">
                        {isSubscribed ? "Subscribed" : "Subscribe"}
                      </span>
                      {!isSubscribed ? (
                        <span className="flex items-center justify-center pl-1 py-2 border-l border-gray-300 text-[0.6rem]">
                          x25
                          <Image
                            src="/chirpsIcon.png"
                            width={15}
                            height={15}
                            className="ml-1"
                          />
                        </span>
                      ) : (
                        <span className="flex items-center justify-center px-1 rounded-r py-2 border-l border-gray-300 text-[0.8rem] bg-green-500">
                          1 month
                        </span>
                      )}
                    </div>{" "}
                    {/* <Button
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
                    </Button> */}
                    {/* <Button
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
                    </Button> */}
                  </div>
                )}
              </div>
              <span className="text-sm sm:text-lg text-gray-500 mt-2">
                Started {timeElapsed}
              </span>
            </div>
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
        </div>

        <div className="w-full lg:w-[30%] pt-4 bg-gray-800 flex flex-col h-[85vh] overflow-hidden rounded-t-lg rounded-b-md relative">
          <h2 className="text-xl font-bold text-white ml-2">Live Chat</h2>
          <div
            className="flex-grow mt-4 overflow-y-auto "
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style jsx>{`
              ::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            {chatMessages.length > 0 ? (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between  pl-2 m-1 p-1 relative rounded ${
                    msg.messageType == "chirp"
                      ? "bg-gradient-to-r from-indigo-700 via-purple-500 to-pink-600"
                      : ""
                  } hover:bg-gray-900 pt-1 group`}
                >
                  <div className={`w-full flex  items-center`}>
                    {/* <CustomAvatar
                      className="inline"
                      src={msg.photoUrl}
                      alt={msg.chatAuthor}
                      fallbackSrc={"https://github.com/shadcn.png"}
                    /> */}{" "}
                    <span
                      className={`text-[0.75rem] ${
                        msg.messageType == "chirp"
                          ? "text-gray-400"
                          : "text-gray-400"
                      }`}
                    >
                      {formatTimestamp(msg.chatTimestamp)}
                    </span>
                    <div className="text-white ml-[0.5rem] w-[80%]">
                      <div className="flex items-center justify-between w-full">
                        <p className="text-[0.75rem]">
                          <strong>{msg.chatAuthor}</strong>: {msg.message}
                        </p>
                        <span className="flex items-center font-light  text-[0.6rem] text-gray-300 ">
                          {msg.messageType === "chirp" &&
                            `x${msg?.chirpAmount}`}
                          {msg.messageType === "chirp" && (
                            <Image
                              src="/chirpsIcon.png"
                              height={8}
                              width={8}
                              className="ml-[1px]"
                            />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  {(msg.chatAuthor === viewerUsername ||
                    username === viewerUsername) && (
                    <button
                      className="text-red-500 text-xl absolute right-0 hidden group-hover:block bg-gray-400 rounded-r bg-opacity-30 h-full pl-1"
                      onClick={() => handleDeleteMessage(msg)}
                    >
                      <MdDelete className="text-red-700 items-center mx-2 " />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 ml-2">No messages yet.</p>
            )}
          </div>
          <div className="w-full bg-purple-700 pl-1 py-1">
            <div className="flex items-center w-full bg-purple-700 pl-1 py-1">
              {/* <CustomAvatar
                className="inline"
                src={user.photoUrl}
                alt={user.chatAuthor}
                fallbackSrc={"https://github.com/shadcn.png"}
              /> */}
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onSubmit={handleSendMessage}
                placeholder="Type a message..."
                className="flex-grow px-2 rounded-l bg-transparent text-white focus-within:border-transparent outline-none w-[60%]"
              />
              <div
                className=" flex items-center mx-1 cursor-pointer text-gray-300 font-light text-right w-[30%]  justify-end"
                onClick={() => {
                  setIsChirpsModalOpen(true);
                }}
              >
                <span className="text-sm">
                  {viewerCredits !== 0 && `x${viewerCredits}`}
                </span>
                <Image
                  src="/chirpsIcon.png"
                  width={15}
                  height={15}
                  className="mx-1 mr-2 "
                />
              </div>
              <Button
                onClick={
                  // viewerCredits < 5 ? openBuyChirpsModal :
                  handleSendMessage
                }
                className="bg-purple-950 text-white  mr-1 p-4"
              >
                {/* {viewerCredits < 5 ? "Get Chirps" : "Houl"} */}
                Houl
              </Button>
            </div>
            {/* <div className="flex ml-2">
              <span
                className=" flex items-center mx-1 cursor-pointer "
                onClick={() => {
                  viewerCredits > 5
                    ? setIsChirpsModalOpen(true)
                    : setIsBuyChirpsModalOpen(true);
                }}
              >
                x{viewerCredits}
                <Image
                  src="/chirpsIcon.png"
                  width={15}
                  height={15}
                  className="mx-1"
                />
              </span>
            </div> */}
          </div>
        </div>
      </div>
      {/* Chirps Modal */}
      <Dialog
        open={isChirpsModalOpen}
        onClose={() => setIsChirpsModalOpen(false)}
        className="fixed inset-0 z-10 flex items-center justify-center  bg-black bg-opacity-75 "
      >
        <DialogPanel className="bg-gray-800 p-6 rounded shadow-lg text-white max-w-[35vw]">
          <h3 className="text-xl mb-4 text-center">
            Send Chirps to {username}
          </h3>
          <input
            disabled={viewerCredits < 5 ? true : false}
            type="range"
            min={5}
            max={viewerCredits}
            value={chirpsAmount}
            onChange={(e) => setChirpsAmount(Number(e.target.value))}
            className="w-full bg-transparent"
          />
          {viewerCredits < 5 ? (
            <p className="text-red-600 italic font-normal mb-4">
              Minimum 5 chirps required.
            </p>
          ) : (
            <p className="text-center mb-4">{chirpsAmount} Chirps</p>
          )}

          <input
            placeholder="Message available at x30 chirps!"
            value={chirpsMessage}
            onChange={(e) => {
              setChirpsMessage(e.target.value);
              setMessageInput(e.target.value);
            }}
            disabled={chirpsAmount >= 30 ? false : true}
            className="w-full p-2 rounded bg-gray-700 text-white"
          />

          <Button
            className="w-full mt-4 bg-green-600"
            onClick={handleSendChirps}
          >
            Send Chirps
          </Button>
          <Button
            className="w-full mt-4 bg-purple-950 text-white"
            onClick={() => {
              setIsChirpsModalOpen(false);
              setIsBuyChirpsModalOpen(true);
            }}
          >
            Buy Chirps
          </Button>
        </DialogPanel>
      </Dialog>
      {/* Buy Chirps Modal */}
      <Dialog
        open={isBuyChirpsModalOpen}
        onClose={() => setIsBuyChirpsModalOpen(false)}
        className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-75"
      >
        <DialogPanel
          className="bg-gray-700 p-8 rounded shadow-lg text-black w-[90%] max-w-md relative"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
        >
          <h3 className="text-2xl mb-4 text-center text-white">Buy Chirps</h3>
          <div className="space-y-4">
            <Button
              className="w-full bg-purple-700 flex items-center hover:bg-purple-600 text-white"
              onClick={() => handleBuyChirps(30, 30)}
            >
              x30
              <Image
                src="/chirpsIcon.png"
                height={15}
                width={15}
                className="mx-1"
              />{" "}
              Chirps for 30 INR
            </Button>
            <Button
              className="w-full bg-purple-700 flex items-center hover:bg-purple-600 text-white"
              onClick={() => handleBuyChirps(80, 80)}
            >
              x80
              <Image
                src="/chirpsIcon.png"
                height={15}
                width={15}
                className="mx-1"
              />{" "}
              Chirps for 80 INR
            </Button>{" "}
            <Button
              className="w-full bg-purple-700 flex items-center hover:bg-purple-600 text-white"
              onClick={() => handleBuyChirps(120, 110)}
            >
              x120
              <Image
                src="/chirpsIcon.png"
                height={15}
                width={15}
                className="mx-1"
              />{" "}
              Chirps for 110 INR
            </Button>{" "}
            <Button
              className="w-full bg-purple-700 flex items-center hover:bg-purple-600 text-white"
              onClick={() => handleBuyChirps(180, 150)}
            >
              x180
              <Image
                src="/chirpsIcon.png"
                height={15}
                width={15}
                className="mx-1"
              />{" "}
              Chirps for 150 INR
            </Button>
          </div>
        </DialogPanel>
      </Dialog>
    </>
  );
};

export default StreamPage;
