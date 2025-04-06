import type { NextConfig } from "next";
// import withPWAInit from "next-pwa";

// const withPWA = withPWAInit({
//   dest: "public",
//   register: true,
//   skipWaiting: true, // Recommended for faster updates
//   disable: process.env.NODE_ENV === "development", // Disable PWA in development
// });

const nextConfig: NextConfig = {
  /* config options here */
};

// export default withPWA(nextConfig);
export default nextConfig; // Export the plain config for now
