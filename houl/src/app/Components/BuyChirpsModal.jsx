import { Button } from "@/components/ui/button";
import { Dialog, DialogPanel } from "@headlessui/react";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";

const BuyChirpsModal = ({ isOpen, onClose }) => {
  const [viewerCredits, setViewerCredits] = useState(0);
  const [user, setUser] = useState(null);
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
        setViewerCredits(data.credits || 0); // Set the viewer's credits (default 0)
      }
    } catch (error) {
      console.error("Error fetching viewer data:", error);
    }
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
  const handleBuyChirps = async (chirps, amount) => {
    const razorpayLoaded = await loadRazorpayScript();

    if (!razorpayLoaded) {
      toast.error("Failed to load Razorpay SDK. Please try again.", {
        position: "top-center",
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
          position: "top-center",
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
            // setIsBuyChirpsModalOpen(false);
            onClose();

            // Show a success toast
            toast.success(`You successfully bought ${chirps} chirps!`, {
              position: "top-center",
            });
          } catch (error) {
            console.error("Error adding chirps:", error);
            toast.error(
              "Failed to update chirps after payment. Please contact support.",
              {
                position: "top-center",
              }
            );
          }
        },
        prefill: {
          name: user.displayName,
          email: user.email,
        },
        theme: {
          color: "#5d0690",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Payment Failed", error);
    }
  };
  return (
    <>
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
      <Dialog
        open={isOpen}
        onClose={onClose}
        className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-75"
      >
        <DialogPanel
          className="bg-gray-900 p-8 rounded shadow-lg text-black w-[90%] max-w-md relative"
          onClick={(e) => e.stopPropagation()}
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
                alt="Chirps"
              />
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
                alt="Chirps"
              />
              Chirps for 80 INR
            </Button>
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
                alt="Chirps"
              />
              Chirps for 110 INR
            </Button>
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
                alt="Chirps"
              />
              Chirps for 150 INR
            </Button>
          </div>
        </DialogPanel>
      </Dialog>
    </>
  );
};

export default BuyChirpsModal;
