import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force le serveur à écouter uniquement sur localhost
  // Évite les problèmes de redirection vers l'IP locale (192.168.x.x)
};

export default nextConfig;
