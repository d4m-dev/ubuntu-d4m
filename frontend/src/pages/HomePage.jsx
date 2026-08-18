// src/pages/HomePage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HeroSection from "../components/home/HeroSection";
import TechMarquee from "../components/home/TechMarquee";
import FeaturesSection from "../components/home/FeaturesSection";
import SecuritySection from "../components/home/SecuritySection";
import CtaSection from "../components/home/CtaSection";
import Footer from "../components/common/Footer";
import SEO from "../components/common/SEO";

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="d4m-page flex flex-col min-h-screen relative text-[#f8fafc] font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden">
      <SEO title="Trang chủ" description="D4M Music Pro & Hệ sinh thái D4M — nền tảng nghe nhạc, công cụ AI và mạng xã hội công nghệ Việt." />
      <div className="cyber-grid" aria-hidden="true" />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      
      {/* KHÔNG GIAN NỀN CYBERPUNK MATRIX */}
      <div className="cyber-grid" aria-hidden="true"></div>
      <div className="orb orb-1" aria-hidden="true"></div>
      <div class="orb orb-2" aria-hidden="true"></div>
      <div className="orb orb-3" aria-hidden="true"></div>

      {/* 🌌 NAVBAR DARK GLASSMORPHISM */}
      <nav className={`fixed w-full z-50 border-b border-white/5 backdrop-blur-xl transition-all duration-300 ${isScrolled ? 'bg-black/70 shadow-lg' : 'bg-black/30'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.6)] border border-white/20">
              <i className="fa-solid fa-cloud text-white text-lg"></i>
            </div>
            <span className="font-heading font-black text-2xl tracking-wide text-white">D4M<span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">.Cloud</span></span>
          </a>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-200">
            <a href="#features" className="hover:text-white transition-colors">Hệ Sinh Thái</a>
            <a href="#security" className="hover:text-white transition-colors">Aegis Shield</a>
            <a href="/admin/admin-scripts" className="hover:text-purple-400 transition-colors"><i className="fa-solid fa-terminal mr-1"></i> Cronjobs</a>
          </div>

          <Link to="/hub" className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg flex items-center gap-2 group">
            <span>Mở Trạm Hub</span> <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
          </Link>
        </div>
      </nav>

      {/* NỘI DUNG CHÍNH */}
      <main id="main-content" role="main" className="flex-1">
        <HeroSection />
        <TechMarquee />
        <FeaturesSection />
        <SecuritySection />
        <CtaSection />
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}