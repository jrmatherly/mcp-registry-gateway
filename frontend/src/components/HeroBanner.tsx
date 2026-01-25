import { IconSparkles } from "@tabler/icons-react";
import type React from "react";

interface HeroBannerProps {
  title?: string;
  subtitle?: string;
  onRegisterClick?: () => void;
  showRegisterButton?: boolean;
}

/**
 * HeroBanner - A premium hero section with gradient background and floating decorative elements.
 * Inspired by modern SaaS dashboards like Adobe CC and enterprise tools.
 */
const HeroBanner: React.FC<HeroBannerProps> = ({
  title = "Welcome to MCP Registry",
  subtitle = "Discover, register, and manage MCP servers and A2A agents in one place.",
  onRegisterClick,
  showRegisterButton = true,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-8 shadow-xl shadow-primary-900/20 dark:shadow-primary-900/40">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-linear-to-br from-primary-600 via-primary-700 to-indigo-800" />

      {/* Mesh overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-white/20 to-transparent rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-linear-to-tr from-cyan-400/20 to-transparent rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Floating geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-8 right-12 w-16 h-16 bg-white/10 rounded-xl rotate-12 backdrop-blur-sm border border-white/20" />
        <div className="absolute top-20 right-32 w-8 h-8 bg-cyan-400/20 rounded-lg rotate-45" />
        <div className="absolute bottom-8 right-24 w-12 h-12 bg-pink-400/20 rounded-full" />
        <div className="absolute bottom-12 left-1/4 w-6 h-6 bg-white/15 rounded-md rotate-12" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-8 py-10 md:py-14">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
              {title}
            </h1>
            <p className="text-white/80 text-base md:text-lg leading-relaxed">
              {subtitle}
            </p>
          </div>

          {showRegisterButton && onRegisterClick && (
            <button
              type="button"
              onClick={onRegisterClick}
              className="group flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 hover:border-white/40 rounded-xl text-white font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary-500/25 shrink-0"
            >
              <IconSparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
              Register New Service
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
