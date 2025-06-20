"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebase";
import * as Tooltip from "@radix-ui/react-tooltip";
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
  setDoc,
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
import {
  CoinsIcon,
  HeartCrack,
  HelpCircle,
  UserIcon,
  UserSquare2,
} from "lucide-react"; // Chirps Icon
import Script from "next/script";
import { HeartFilledIcon } from "@radix-ui/react-icons";
import { v4 as uuidv4 } from "uuid"; // For generating unique viewer IDs
import { number } from "zod";
import Joyride from "react-joyride";
import BuyChirpsModal from "@/app/Components/BuyChirpsModal";
import { isMobile } from "react-device-detect";
import { useRouter } from "next/navigation";
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
  const [viewerCount, setViewerCount] = useState(0); // Live viewer count
  const [streamType, setStreamType] = useState(null);
  const [firstGuideRun, setFirstGuideRun] = useState(true); // First run when page loads
  const [runGuide, setRunGuide] = useState(false); // For subsequent runs
  const viewerId = uuidv4(); // Generate a unique ID for the viewer
  const router = useRouter(); // Initialize useRouter

  // Highlighted: New authentication check and redirect logic
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchViewerData(currentUser.uid);
      } else {
        // Store the intended URL in local storage
        localStorage.setItem("redirectUrl", window.location.pathname);
        router.push("/auth"); // Redirect to auth page
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // Highlighted: Retrieve redirect URL after login
  //If any user comes directly to this page without account creation, user is directed towards auth page and once thay login successfully, they are redirected to this page.

  //sets range to 0 on buy chirps modal
  useEffect(() => {
    if (isChirpsModalOpen) {
      setChirpsAmount(viewerCredits); // Reset chirps amount to 0 when the modal is opened
    }
  }, [isChirpsModalOpen]);

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
        setStreamType(streamData.type);
        setLikes(streamData.likes);
        setDislikes(streamData.dislikes || 0);
        setHasLiked(streamData.likedBy?.includes(user?.uid));
        setHasDisliked(streamData.dislikedBy?.includes(user?.uid));
        setChatMessages(streamData.chat || []);
        setViewerCount(streamData.viewerCount || 0); // Initialize viewer count
      } else {
        router.push("/"); // Redirect to home page if stream not found
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
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeElapsed(
        `${days > 0 ? days + "d " : ""}${hours > 0 ? hours + "h " : ""}${
          minutes > 0 ? minutes + "m ago" : "now"
        }`
        //  `${seconds > 0 ? seconds + "s ago" : "now"}`
      );
    };

    calculateTimeElapsed();
    const intervalId = setInterval(calculateTimeElapsed, 120000); // Refresh every second to include seconds

    return () => clearInterval(intervalId);
  }, [streamTime]);

  // Track viewer joining
  useEffect(() => {
    const addViewer = async () => {
      if (!user || !username) return;

      try {
        const streamsQuery = query(
          collection(db, "streams"),
          where("author", "==", username)
        );
        const streamSnapshot = await getDocs(streamsQuery);

        if (!streamSnapshot.empty) {
          const streamDoc = streamSnapshot.docs[0];
          const streamData = streamDoc.data();
          const streamDocRef = doc(db, "streams", streamDoc.id);

          // Check if the viewer is already present
          if (streamData.viewers && streamData.viewers.includes(user.uid)) {
            console.log("Viewer is already present.");
            return; // Viewer already added, exit function
          }

          // If viewer is not present, add to viewers array
          await updateDoc(streamDocRef, {
            viewers: arrayUnion(user.uid),
          });

          console.log("Viewer added successfully.");
        } else {
          console.log("No active stream found for the author.");
        }
      } catch (error) {
        console.error("Error adding viewer:", error);
      }
    };

    const removeViewer = async () => {
      if (!user || !username) return;

      try {
        const streamsQuery = query(
          collection(db, "streams"),
          where("author", "==", username)
        );
        const streamSnapshot = await getDocs(streamsQuery);

        if (!streamSnapshot.empty) {
          const streamDoc = streamSnapshot.docs[0];
          const streamData = streamDoc.data();
          const streamDocRef = doc(db, "streams", streamDoc.id);

          // Check if the viewer exists before attempting to remove
          if (streamData.viewers && streamData.viewers.includes(user.uid)) {
            await updateDoc(streamDocRef, {
              viewers: arrayRemove(user.uid),
            });
            console.log("Viewer removed successfully.");
          } else {
            console.log("Viewer not found, cannot remove.");
          }
        } else {
          console.log("No active stream found for the author.");
        }
      } catch (error) {
        console.error("Error removing viewer:", error);
      }
    };

    addViewer();

    window.addEventListener("beforeunload", removeViewer); // Remove viewer on page close

    return () => {
      removeViewer();
      window.removeEventListener("beforeunload", removeViewer);
    };
  }, [username, user]);

  // Update viewer count every 5 seconds
  useEffect(() => {
    const updateViewerCount = async () => {
      try {
        const streamsQuery = query(
          collection(db, "streams"),
          where("author", "==", username)
        );
        const streamSnapshot = await getDocs(streamsQuery);

        if (!streamSnapshot.empty) {
          const streamDoc = streamSnapshot.docs[0]; // Get the first stream document
          const streamData = streamDoc.data();
          const streamDocRef = doc(db, "streams", streamDoc.id); // Reference to the stream document

          const currentViewers = streamData.viewers || [];

          // Update the viewerCount field based on the number of unique viewers
          await updateDoc(streamDocRef, {
            viewerCount: currentViewers.length,
          });

          setViewerCount(currentViewers.length); // Update local viewer count
        } else {
          console.log("No active stream found for the author.");
        }
      } catch (error) {
        console.error("Error updating viewer count: ", error);
      }
    };

    const intervalId = setInterval(updateViewerCount, 5000); // Update viewer count every 5 seconds

    return () => clearInterval(intervalId);
  }, [username]);

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

  // Fetching author's UID and setting authorId
  useEffect(() => {
    if (!username || !user) return;

    const fetchUserData = async () => {
      // Fetching streamer data
      const authorUid = await fetchAuthorUid(username);
      if (authorUid) {
        // Ensure authorUid is valid before setting it
        setAuthorId(authorUid);
        const userDocRef = doc(db, "users", authorUid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCreatorAvatar(userData.photoUrl);
          setFollowers(userData.followers?.length || 0);
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
      } else {
        console.error("Error: Author UID could not be fetched.");
      }
    };

    fetchUserData();
  }, [username, user]);

  // Follow/unfollow logic
  const handleFollow = async () => {
    const userDocRef = doc(db, "users", authorId);

    try {
      await updateDoc(userDocRef, {
        followers: arrayUnion(user.uid),
      });

      setFollowers(followers + 1); // Update local state
      setIsFollowing(true); // Set following status to true
      toast.success(`You started following ${username}`, {
        position: "top-center",
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
        position: "top-center",
      });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow. Please try again.");
    }
  };

  // Handle subscribe logic
  // Check for authorId in handleSubscribe
  const handleSubscribe = async () => {
    if (!authorId) {
      console.error("Error: authorId is null. Cannot proceed with subscribe.");
      return; // Prevent subscribing if authorId is not set
    }

    if (viewerCredits < 25) {
      toast.error(`Insufficient credits to subscribe to ${username}`, {
        position: "top-center",
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
        position: "top-center",
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

  //useEffect for checking new chirp activity
  useEffect(() => {
    if (!username) return;

    // Fetch stream data
    const streamsQuery = query(
      collection(db, "streams"),
      where("author", "==", username)
    );

    const unsubscribe = onSnapshot(streamsQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const streamDoc = snapshot.docs[0]; // Get the first stream document
        const streamData = streamDoc.data();
        const chirpsEvents = streamData.chirpsEvents || [];

        // Find the most recent chirp event and show a toast for it if not displayed
        if (chirpsEvents.length > 0) {
          const recentChirp = chirpsEvents[chirpsEvents.length - 1];

          if (!recentChirp.displayed) {
            // Show the toast
            toast(
              `${
                recentChirp.chirpsMessage
                  ? `🎉 ${recentChirp.username} sent x${recentChirp.chirpsAmount} chirps!: ${recentChirp.chirpsMessage}`
                  : `🎉 ${recentChirp.username} sent x${recentChirp.chirpsAmount} chirps!`
              }`,
              {
                duration: 7000,
                position: "top-center",
                style: {
                  backgroundColor: "#f59e0b",
                  color: "#fff",
                  padding: "2 rem 3rem",
                },
              }
            );

            // After displaying, update the chirp event's "displayed" field to true
            const updatedChirpsEvents = chirpsEvents.map((chirp) =>
              chirp === recentChirp ? { ...chirp, displayed: true } : chirp
            );

            // Update the Firestore document with the modified chirpsEvents array
            await updateDoc(streamDoc.ref, {
              chirpsEvents: updatedChirpsEvents,
            });
          }
        }
      }
    });

    return () => unsubscribe(); // Cleanup subscription on component unmount
  }, [username]);

  const handleSendChirps = async () => {
    if (viewerCredits < chirpsAmount) {
      toast.error(
        `You don't have enough credits to send ${chirpsAmount} chirps`,
        {
          position: "top-center",
        }
      );
      return;
    }

    const viewerDocRef = doc(db, "users", user.uid); // Viewer document reference
    const streamsQuery = query(
      collection(db, "streams"),
      where("author", "==", username)
    );

    try {
      // Deduct chirps (credits) from the viewer
      await updateDoc(viewerDocRef, {
        credits: viewerCredits - chirpsAmount,
      });

      setViewerCredits(viewerCredits - chirpsAmount);

      // Store chirps event in the Firestore for all viewers
      const streamSnapshot = await getDocs(streamsQuery);
      if (!streamSnapshot.empty) {
        const streamDocRef = streamSnapshot.docs[0].ref;
        const streamData = streamSnapshot.docs[0].data();
        const authorUsername = streamData.author;

        // Add chirps event to Firestore
        const newChirpEvent = {
          username: viewerUsername,
          chirpsAmount,
          chirpsMessage:
            chirpsMessage.length > 0 && chirpsAmount >= 30
              ? chirpsMessage
              : null,
          timestamp: new Date(),
          displayed: false, // This will be handled in the useEffect for showing toasts
        };

        await updateDoc(streamDocRef, {
          chirpsEvents: arrayUnion(newChirpEvent),
        });

        // Append the chirps message to the chat as well
        if (chirpsMessage.length > 0 && chirpsAmount >= 30) {
          const newChatMessage = {
            chatAuthor: viewerUsername,
            message: chirpsMessage,
            chatTimestamp: new Date(),
            messageType: "chirp", // Mark as a chirp message
            chirpAmount: chirpsAmount,
          };

          await updateDoc(streamDocRef, {
            chat: arrayUnion(newChatMessage), // Add message to chat
          });
        }

        // Add chirpsAmount to the author's credits
        const authorDocRef = doc(db, "users", authorId); // Reference to author's document
        const authorDoc = await getDoc(authorDocRef);

        if (authorDoc.exists()) {
          const authorCredits = authorDoc.data().credits || 0;

          // Update the author's credits
          await updateDoc(authorDocRef, {
            credits: authorCredits + chirpsAmount,
          });
        }

        setIsChirpsModalOpen(false);
        setMessageInput(""); // Reset input after sending
        setChirpsMessage(""); // Reset message
      }
    } catch (error) {
      console.error("Error sending chirps:", error);
    }
  };

  const handleSendMessage = async () => {
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
        chatAuthor,
        message: messageInput,
        chatTimestamp: new Date(),
        messageType: "normal", // Regular chat message
      };

      await updateDoc(streamDocRef, {
        chat: arrayUnion(newMessage), // Add to chat
      });

      setMessageInput(""); // Reset input after sending
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
  // Callback to reset the state after the guide finishes
  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = ["finished", "skipped"];

    if (finishedStatuses.includes(status)) {
      setRunGuide(false); // Reset the run state once the guide finishes or is skipped
    }
  };

  // Function to handle the button click to start the guide
  const startGuide = () => {
    setRunGuide(true); // Start Joyride when button is clicked
  };

  const steps = [
    {
      target: ".streamPage_Video",
      content: "This is the Live Video area.",
      placement: "center",
      floaterProps: {
        placement: "right", // Position the tooltip above the beacon
        offset: {
          x: 0, // No horizontal offset
          y: 0, // Adjust the vertical offset as needed
        },
      },
    },
    {
      target: ".streamPage_SubscribeFollow",
      content: "You can follow or Subscribe to streamers you like from here!",
      placement: "top",
    },
    // {
    //   target: ".streamPage_Chat",
    //   content: "This is the Chat Section",
    //   placement: "left",
    // },
    // {
    //   target: ".streamPage_ChatWindow",
    //   content: "This is Live Chat.",
    //   placement: "left",
    // },
    // {
    //   target: ".streamPage_ChatInput",
    //   content: "This is Live Chat Input Field.",
    //   placement: "top",
    // },
    {
      target: ".streamPage_ChatCredits",
      content:
        "You can Gift or Buy credits to gift streamers. These credits can be used as fuel for starting streams on Houl, availing great discounts on our partner brands or even be credited as Cash!",
      placement: "top",
    },
    {
      target: ".streamPage_rerunGuide",
      content: "Re-run Guide",
      placement: "left",
    },
  ];
  return (
    <>
      {/* Help Icon */}
      <HelpCircle
        className="absolute right-0 top-[10vh] cursor-pointer h-10 w-10 z-50 fill-red-600 streamPage_rerunGuide"
        onClick={startGuide}
      />

      {/* Joyride Component */}
      <Joyride
        run={firstGuideRun}
        steps={steps}
        continuous
        styles={{
          options: {
            arrowColor: "#fcfefd",
            beaconSize: 36,
            backgroundColor: "#fcfefd",
            overlayColor: "rgba(25, 9, 1, 0.739)",
            primaryColor: "#ff0000",
            textColor: "#120022",
            width: 400,
            zIndex: 1000,
          },
        }}
      />
      {/* Joyride Component runonly on clicking Icon*/}
      <Joyride
        run={runGuide} // Runs Joyride when button is clicked
        steps={steps}
        continuous
        callback={handleJoyrideCallback} // Callback to handle finishing or skipping
        styles={{
          options: {
            arrowColor: "#fcfefd",
            beaconSize: 36,
            backgroundColor: "#fcfefd",
            overlayColor: "rgba(25, 9, 1, 0.739)",
            primaryColor: "#ff0000",
            textColor: "#120022",
            width: 400,
            zIndex: 1000,
          },
        }}
      />
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
              color: "white",
            },
          },
        }}
      />
      <div className="flex flex-col lg:flex-row p-4 justify-between bg-gray-900 h-max">
        <div className="w-full lg:w-[70%] mb-4 lg:mb-0 lg:pr-4 relative  streamPage_Video">
          {streamUrl ? (
            <div className="relative">
              {streamType == "demo" ? (
                <iframe
                  className="w-[98%] mx-auto mb-1 h-[60vh]"
                  // width="90%"
                  height="auto"
                  src={`${streamUrl}&rel=0&mute=1`}
                  // src="https://www.youtube.com/embed/ri-0YCf_rTw?si=fkmWXrOK7wA5oZum&autoplay=true"
                  title="Houl Demo Stream"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allowfullscreen
                ></iframe>
              ) : (
                <ReactPlayer
                  url={streamUrl}
                  playing={true}
                  controls
                  autoPlay={true}
                  playsinline={true}
                  className="react-player"
                  width="100%"
                  height="auto"
                  style={{ maxHeight: "75vh" }}
                  config={{
                    file: {
                      attributes: {
                        autoPlay: true,
                        playsInline: true,
                      },
                      hlsOptions: {
                        startPosition: -1,
                      },
                    },
                  }}
                />
              )}
              <div className="flex justify-between items-center mt-2 py-1">
                <h2 className="text-xl sm:text-2xl md:text-3xl  font-bold text-white ">
                  {streamName}
                </h2>
                {/* Viewer count */}
                <span className="text-xl flex  items-center sm:text-md text-red-500 ml-2">
                  {viewerCount}
                  <UserIcon
                    className="text-red-400 inline fill-red-500 mx-1"
                    height={20}
                    width={20}
                  />
                </span>
              </div>

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
                  <div className="streamPage_SubscribeFollow flex items-center space-x-2 mt-2 sm:mt-0 ">
                    <div
                      onClick={isFollowing ? handleUnfollow : handleFollow}
                      className={`rounded flex  items-center p-1 cursor-pointer ${
                        isFollowing ? "bg-gray-500" : "bg-purple-700"
                      }`}
                    >
                      {isFollowing ? <HeartCrack /> : <HeartFilledIcon />}
                      <span className="mx-1">
                        {isFollowing ? "Unfollow" : "Follow"}
                      </span>
                    </div>
                    <div
                      className={`flex rounded pl-2 pr-1  items-center text-white cursor-pointer ${
                        isSubscribed ? "bg-green-600" : "bg-purple-600 "
                      }`}
                      onClick={() => {
                        isSubscribed
                          ? toast.success("Already Subscribed!")
                          : handleSubscribe();
                      }}
                    >
                      <span className="pr-2 py-1">
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
                            alt="Chirps"
                          />
                        </span>
                      ) : (
                        <span className="flex items-center justify-center px-1 rounded-r py-2 border-l border-gray-300 text-[0.8rem] bg-green-500">
                          1 month
                        </span>
                      )}
                    </div>
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
        {/* Chat Section */}
        <div className="w-full lg:w-[30%] pt-4 bg-gray-800 flex flex-col h-[85vh] overflow-hidden rounded-t-lg rounded-b-md relative streamPage_Chat">
          <h2 className="text-xl font-bold text-white ml-2">Live Chat</h2>
          <div
            className="flex-grow mt-4 overflow-y-auto streamPage_ChatWindow"
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
                  <div className={`w-full flex  text-wrap`}>
                    <p className="text-[0.75rem] mr-1 inline w-[90%]">
                      <span
                        className={`text-[0.7rem] text-center my-auto mr-1 ${
                          msg.messageType == "chirp"
                            ? "text-gray-400"
                            : "text-gray-400"
                        }`}
                      >
                        {formatTimestamp(msg.chatTimestamp)}
                      </span>
                      {/* <div className="text-white flex ml-[0.5rem] w-[80%]"> */}

                      {/* <p className="text-[0.75rem] mr-1 inline"> */}
                      <strong className="text-[0.75rem] mr-1 inline">
                        {msg.chatAuthor}:
                      </strong>

                      {msg.message}
                    </p>

                    {/* </div> */}
                    {/* chirps amount banner */}
                    <span className="flex items-center font-light  text-[0.6rem] text-gray-300 ">
                      {msg.messageType === "chirp" && `x${msg?.chirpAmount}`}
                      {msg.messageType === "chirp" && (
                        <Image
                          src="/chirpsIcon.png"
                          height={8}
                          width={8}
                          className="ml-[1px]"
                          alt="Chirps"
                        />
                      )}
                    </span>
                  </div>
                  {(msg.chatAuthor === viewerUsername ||
                    username === viewerUsername) && (
                    <Tooltip.Provider delayDuration={1000}>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button
                            className="text-red-500 text-xl absolute right-0 hidden group-hover:block bg-gradient-to-r from-slate-700  to-gray-800 rounded-r-[0.125rem] bg-opacity-1 h-full pl-1"
                            onClick={() => handleDeleteMessage(msg)}
                          >
                            <MdDelete className="text-red-700 items-center mx-2 " />
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            className="bg-gray-400 bg-opacity-55 p-1 rounded z-50 text-[0.6rem]"
                            sideOffset={5}
                            side="bottom"
                          >
                            <span>Delete your Comment</span>
                            <Tooltip.Arrow className="fill-gray-500 fill-opacity-25 gray-500" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 ml-2">No messages yet.</p>
            )}
          </div>
          <div className="w-full bg-purple-700 pl-1 py-1 streamPage_ChatInput">
            <div className="flex items-center w-full bg-purple-700 pl-1 py-1">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                    e.preventDefault(); // Prevents the newline from being added to the input
                  }
                }}
                placeholder="Type a message..."
                className="flex-grow px-2 py-1 rounded bg-purple-800 text-white focus-within:border-transparent outline-none w-full"
              />
              <div
                className=" flex items-center mx-1 cursor-pointer text-gray-300 font-light text-right w-[30%]  justify-end streamPage_ChatCredits"
                onClick={() => {
                  setIsChirpsModalOpen(true);
                }}
              >
                <span className="text-sm">
                  {viewerCredits >= 0 && `x${viewerCredits}`}
                </span>
                <Image
                  src="/chirpsIcon.png"
                  width={15}
                  height={15}
                  className="mx-1 mr-2 "
                  alt="Chirps"
                />
              </div>
              <Button
                onClick={handleSendMessage}
                className="bg-purple-950 text-white  mr-1 p-4"
              >
                Houl
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Send Chirps Modal */}
      <Dialog
        open={isChirpsModalOpen}
        onClose={() => setIsChirpsModalOpen(false)}
        className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-75 "
      >
        <DialogPanel className="bg-gray-900 p-6 rounded shadow-lg text-white sm:w-[45vw] w-[75vw] flex flex-col">
          <h3 className="text-xl mb-4 text-center">
            Send Chirps to {username}
          </h3>

          <input
            disabled={viewerCredits < 5 ? true : false}
            id="range3"
            type="range"
            min={5}
            max={viewerCredits}
            value={chirpsAmount} // Ensure value is controlled by state
            onChange={(e) => setChirpsAmount(Number(e.target.value))}
            className="w-[90%] bg-transparent my-1 mx-auto"
          />

          {viewerCredits < 5 ? (
            <p className="text-red-600 italic font-normal mb-4">
              Minimum 5 chirps required.
            </p>
          ) : (
            <div className="flex justify-between items-center mx-auto mb-2 mt-4">
              <input
                type="number"
                min={5}
                max={viewerCredits}
                value={chirpsAmount}
                className=" bg-transparent text-center min-w-[2.5vw] w-[7vw] md:w-[3vw] "
                onChange={(e) => {
                  if (Number(e.target.value) < 5) {
                    setChirpsAmount(5);
                  } else if (Number(e.target.value) <= viewerCredits) {
                    setChirpsAmount(Number(e.target.value));
                  } else setChirpsAmount(viewerCredits);
                }}
              />
              <p className="text-center ml-[0.25rem]">Chirps</p>
            </div>
          )}

          <input
            placeholder="Message available at x30 chirps!"
            value={chirpsAmount >= 30 ? chirpsMessage : ""}
            onChange={(e) => {
              setChirpsMessage(e.target.value);
              setMessageInput(e.target.value);
            }}
            disabled={chirpsAmount >= 30 ? false : true}
            className="w-full p-1 xl:p-2 rounded bg-gray-700 text-white disabled:bg-gray-600 text-[0.8rem] xl:text-base"
          />
          {chirpsAmount < 30 && (
            <p className="text-sm text-red-600 italic">
              Cannot send message if chirps amount is less than 30!
            </p>
          )}
          <Button
            className="w-full md:w-[50%] md:mx-auto mt-4 bg-green-600 font-bold text-yellow-100"
            onClick={handleSendChirps}
          >
            Send Chirps
          </Button>
          <Button
            className="w-full md:w-[50%] md:mx-auto mt-4 bg-purple-950 text-white"
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
      {isBuyChirpsModalOpen && (
        <BuyChirpsModal
          isOpen={isBuyChirpsModalOpen}
          onClose={() => setIsBuyChirpsModalOpen(false)}
        />
      )}
    </>
  );
};

export default StreamPage;
