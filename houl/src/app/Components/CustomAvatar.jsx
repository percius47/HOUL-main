// Import necessary components from Shadcn
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { useState } from "react";

const CustomAvatar = ({ src, alt, fallbackSrc }) => {
  const [imgSrc, setImgSrc] = useState(src);

  const handleImageError = () => {
    setImgSrc(fallbackSrc); // Switch to the fallback image if the main image fails to load
  };

  return (
    <Avatar className="h-9 w-9">
      <AvatarImage
        src={imgSrc}
        alt={alt}x
        className="bg-transparent "
        onError={handleImageError} // Handle image loading errors
      />
      <AvatarFallback>
        <img
          src={fallbackSrc}
          alt="fallback avatar"
          className=" rounded-full object-cover bg-transparent"
        />
      </AvatarFallback>
    </Avatar>
  );
};

export default CustomAvatar;
