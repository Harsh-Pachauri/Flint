import React from 'react';
import Hero from './sections/Hero';
import MarqueeStrip from './sections/MarqueeStrip';
import Features from './sections/Features';
import HowItWorks from './sections/HowItWorks';
import Testimonials from './sections/Testimonials';
import CTABanner from './sections/CTABanner';
import Footer from './sections/Footer';
import '../styles/homepage.css';

const Homepage: React.FC = () => {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* ORBs */}
      <div
        className="orb"
        style={{
          width: '500px',
          height: '500px',
          top: '-120px',
          right: '-80px',
          background: 'radial-gradient(circle, rgba(224, 48, 192, 0.07) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
      <div
        className="orb"
        style={{
          width: '400px',
          height: '400px',
          top: '200px',
          left: '-100px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      <Hero />
      <MarqueeStrip />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CTABanner />
      <Footer />
    </div>
  );
};

export default Homepage;
