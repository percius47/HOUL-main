/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "github.com",
      "firebasestorage.googleapis.com",
    ], // Add this line to allow images from Google
  },
};
export default nextConfig;
