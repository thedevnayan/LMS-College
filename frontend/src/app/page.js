'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { 
  ArrowRight, Play, BookOpen, FileText, CheckSquare, 
  BarChart, Cpu, Calendar, CheckCircle2, ChevronDown, Folder, Sparkles
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-warm-linen)' }}>
      <Navbar />
      <main style={{ paddingBottom: '120px' }}>
        <HeroSection />
        <SocialProof />
        <FeaturesSection />
        <DarkEditorialSection />
        <TimelineSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 99999, 
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      padding: '16px 28px', backgroundColor: 'var(--color-warm-linen)',
      borderBottom: '1px solid var(--color-ink)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Button variant="nav">LMS</Button>
        </Link>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="#features" className="text-body" style={{ textDecoration: 'none', color: 'var(--color-ink)', fontWeight: 400 }}>
            Features
          </a>
          <Link href="/admin/login" className="text-body" style={{ textDecoration: 'none', color: 'var(--color-ink)', fontWeight: 400 }}>
            Faculty Portal
          </Link>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <Button variant="ghost">Log in</Button>
        </Link>
        <Link href="/register" style={{ textDecoration: 'none' }}>
          <Button variant="primary">Get Started</Button>
        </Link>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section 
      className="max-w-screen" 
      style={{ 
        paddingTop: '64px', 
        paddingBottom: '80px', 
        textAlign: 'center', 
        position: 'relative'
      }}
    >
      {/* Interactive Decorative Atmosphere Shapes (Flanked on the sides, low z-index) */}
      <motion.div 
        drag dragConstraints={{ left: -50, right: 50, top: -50, bottom: 50 }}
        whileHover={{ scale: 1.12, cursor: 'grab' }} whileTap={{ scale: 0.95, cursor: 'grabbing' }}
        animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }} 
        transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
        className="hero-floating-decor hairline-border"
        title="Drag me!"
        style={{ 
          position: 'absolute', top: '50px', left: '3%', 
          width: '54px', height: '54px', 
          backgroundColor: 'var(--color-sun-yellow)', borderRadius: '12px', 
          zIndex: 1, boxShadow: 'var(--shadow-sm)'
        }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -50, right: 50, top: -50, bottom: 50 }}
        whileHover={{ scale: 1.12, cursor: 'grab' }} whileTap={{ scale: 0.95, cursor: 'grabbing' }}
        animate={{ y: [0, 14, 0] }} 
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.8 }}
        className="hero-floating-decor"
        title="Drag me!"
        style={{ 
          position: 'absolute', top: '80px', right: '4%', 
          width: '58px', height: '58px', 
          backgroundColor: 'var(--color-hot-pink)', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', 
          zIndex: 1
        }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -40, right: 40, top: -40, bottom: 40 }}
        whileHover={{ scale: 1.15, cursor: 'grab' }} whileTap={{ scale: 0.95, cursor: 'grabbing' }}
        animate={{ y: [0, -10, 0] }} 
        transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut", delay: 0.4 }}
        className="hero-floating-decor hairline-border"
        title="Drag me!"
        style={{ 
          position: 'absolute', top: '240px', left: '1.5%', 
          width: '38px', height: '38px', 
          backgroundColor: 'var(--color-lime-burst)', borderRadius: '50%', 
          zIndex: 1, boxShadow: 'var(--shadow-sm)'
        }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -40, right: 40, top: -40, bottom: 40 }}
        whileHover={{ scale: 1.12, cursor: 'grab' }} whileTap={{ scale: 0.95, cursor: 'grabbing' }}
        animate={{ y: [0, 10, 0], rotate: [-4, 4, -4] }} 
        transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: 1.2 }}
        className="hero-floating-decor hairline-border"
        title="Drag me!"
        style={{ 
          position: 'absolute', top: '260px', right: '2%', 
          width: '70px', height: '26px', 
          backgroundColor: 'var(--color-periwinkle)', borderRadius: '96px', 
          zIndex: 1, boxShadow: 'var(--shadow-sm)'
        }} 
      />

      {/* Main Center Content (Higher z-index so nothing blocks interaction) */}
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '920px', margin: '0 auto' }}>
        
        {/* Streamtime Pill Tag */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          style={{ display: 'inline-flex', alignItems: 'center', marginBottom: '20px' }}
        >
          <div 
            className="hairline-border"
            style={{ 
              padding: '6px 18px', 
              backgroundColor: 'var(--color-paper-white)', 
              borderRadius: '96px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              letterSpacing: '-0.2px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <span style={{ 
              display: 'inline-block', width: '8px', height: '8px', 
              borderRadius: '50%', backgroundColor: 'var(--color-lime-burst)',
              border: '1px solid var(--color-ink)'
            }} />
            <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>Next-Gen Academic Learning Platform</span>
          </div>
        </motion.div>

        {/* Subtitle / Eyebrow */}
        <motion.p 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.4, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
          className="text-subheading" 
          style={{ color: 'var(--color-charcoal)', marginBottom: '16px', letterSpacing: '-0.5px' }}
        >
          A way better way of working
        </motion.p>
        
        {/* Hero Title */}
        <motion.h1 
          initial={{ y: 25, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.45, delay: 0.14, ease: [0.23, 1, 0.32, 1] }}
          className="text-display" 
          style={{ 
            color: 'var(--color-ink)', 
            marginBottom: '20px', 
            lineHeight: '1.05',
            letterSpacing: '-1.8px'
          }}
        >
          Learn <span className="calligraphy-word">Without</span> Friction
        </motion.h1>

        {/* Hero Description */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="text-body-lg"
          style={{ 
            color: 'var(--color-charcoal)', 
            maxWidth: '640px', 
            margin: '0 auto 32px',
            lineHeight: '1.4',
            opacity: 0.9
          }}
        >
          Curated course curriculum, interactive test assessments, rich multimedia notes, and real-time student analytics — designed for focused academic mastery.
        </motion.p>
        
        {/* Call to Action Buttons */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ duration: 0.4, delay: 0.26, ease: [0.23, 1, 0.32, 1] }}
          style={{ 
            display: 'flex', 
            gap: '16px', 
            justifyContent: 'center', 
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '16px'
          }}
        >
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <Button variant="primary" style={{ padding: '15px 34px', fontSize: '17px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>Start Learning Today</span>
              <ArrowRight size={18} />
            </Button>
          </Link>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" style={{ padding: '15px 28px', fontSize: '17px' }}>
              Sign In to Portal
            </Button>
          </Link>
        </motion.div>

        {/* Trust Subtext */}
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-caption"
          style={{ color: 'var(--color-fog)', marginBottom: '56px' }}
        >
          Instant student enrollment • Interactive quizzes & materials • Free for colleges
        </motion.p>

        {/* Hero Visual Showcase — Featuring High-Res 3D Professor Illustration */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.23, 1, 0.32, 1] }}
          style={{ 
            position: 'relative', 
            maxWidth: '860px', 
            margin: '0 auto', 
            backgroundColor: 'var(--color-paper-white)',
            borderRadius: '16px',
            border: '1px solid var(--color-ink)',
            boxShadow: 'rgba(0, 0, 0, 0.1) 0px 18px 40px -10px, rgba(0, 0, 0, 0.06) 0px 6px 12px 0px',
            overflow: 'hidden'
          }}
        >
          {/* Browser / Classroom Hub Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px 18px', 
            backgroundColor: 'var(--color-warm-linen)',
            borderBottom: '1px solid var(--color-ink)'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff5f56', display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ffbd2e', display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#27c93f', display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)' }} />
              <span className="text-caption" style={{ marginLeft: '12px', color: 'var(--color-charcoal)', opacity: 0.7, fontFamily: 'monospace' }}>
                lms.college.edu/classroom
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="hairline-border" style={{ 
                padding: '2px 10px', 
                borderRadius: '96px', 
                fontSize: '11px', 
                backgroundColor: 'var(--color-lime-burst)',
                color: 'var(--color-ink)',
                fontWeight: 500
              }}>
                ● Active Classroom
              </span>
            </div>
          </div>

          {/* Graphic Showcase Container */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '16px 20px 0' }}>
            <motion.img 
              src="/img/hero_img.png" 
              alt="LMS College Platform Overview"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
              style={{
                width: '100%',
                maxHeight: '500px',
                objectFit: 'contain',
                display: 'block'
              }}
            />

            {/* Streamtime Feature Badge Left */}
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="hairline-border"
              style={{
                position: 'absolute',
                top: '24px',
                left: '20px',
                backgroundColor: 'var(--color-pure-white)',
                padding: '10px 16px',
                borderRadius: 'var(--radius-cards)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: 'var(--shadow-float)',
                zIndex: 5
              }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '5px', backgroundColor: 'var(--color-sun-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-ink)' }}>
                <BookOpen size={16} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 500 }}>Organized Modules</div>
                <div style={{ fontSize: '11px', color: 'var(--color-fog)' }}>PDFs, video & notes</div>
              </div>
            </motion.div>

            {/* Streamtime Feature Badge Right */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.4 }}
              className="hairline-border"
              style={{
                position: 'absolute',
                bottom: '24px',
                right: '20px',
                backgroundColor: 'var(--color-pure-white)',
                padding: '10px 16px',
                borderRadius: 'var(--radius-cards)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: 'var(--shadow-float)',
                zIndex: 5
              }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '5px', backgroundColor: 'var(--color-lime-burst)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-ink)' }}>
                <CheckSquare size={16} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: 500 }}>Instant Feedback</div>
                <div style={{ fontSize: '11px', color: 'var(--color-fog)' }}>Auto-graded tests & tasks</div>
              </div>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

function SocialProof() {
  const stats = [
    { value: "5000+", label: "Students" },
    { value: "30+", label: "Faculty" },
    { value: "98%", label: "Completion" }
  ];
  return (
    <section className="max-w-screen hairline-border" style={{ padding: '64px 24px', backgroundColor: 'var(--color-paper-white)', margin: '0 auto', borderRadius: 'var(--radius-cards)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '32px' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <h2 className="text-heading" style={{ color: 'var(--color-ink)', marginBottom: '8px' }}>{s.value}</h2>
            <p className="text-body-lg" style={{ color: 'var(--color-ink)' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: <Folder />, title: "Curriculum", desc: "Organized modules.", color: "lime" },
    { icon: <BookOpen />, title: "Materials", desc: "Rich multimedia.", color: "yellow" },
    { icon: <FileText />, title: "Assignments", desc: "Rapid feedback.", color: "periwinkle" },
    { icon: <BarChart />, title: "Analytics", desc: "Detailed insights.", color: "sand" }
  ];

  return (
    <section id="features" className="max-w-screen" style={{ padding: '120px 24px' }}>
      <h2 className="text-heading-lg" style={{ textAlign: 'center', marginBottom: '64px', color: 'var(--color-ink)' }}>Everything you need</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {features.map((f, i) => (
          <Card key={i} color={f.color}>
            <div style={{ width: '48px', height: '48px', borderRadius: '5px', backgroundColor: 'var(--color-pure-white)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', border: '1px solid var(--color-ink)' }}>
              {f.icon}
            </div>
            <h3 className="text-subheading" style={{ marginBottom: '12px', color: 'var(--color-ink)' }}>{f.title}</h3>
            <p className="text-body" style={{ color: 'var(--color-ink)' }}>{f.desc}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function DarkEditorialSection() {
  return (
    <section style={{ backgroundColor: 'var(--color-charcoal)', padding: '120px 24px', position: 'relative', overflow: 'hidden' }}>
      <div className="max-w-screen" style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="text-heading-lg" style={{ color: 'var(--color-paper-white)', marginBottom: '32px' }}>Meet Your AI Partner</h2>
          <p className="text-body-lg" style={{ color: 'var(--color-fog)', marginBottom: '40px' }}>
            An intelligent assistant built right into your dashboard to help you learn faster and retain more. Generate quizzes, summarize notes, and explain concepts instantly.
          </p>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" style={{ backgroundColor: 'transparent', borderColor: 'var(--color-paper-white)', color: 'var(--color-paper-white)' }}>
              Explore AI Assistant
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Scattered Atmosphere (Interactive) */}
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        style={{ position: 'absolute', top: '10%', left: '10%', width: '120px', height: '120px', backgroundColor: 'var(--color-sun-yellow)', borderRadius: '50%', zIndex: 1 }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
        style={{ position: 'absolute', bottom: '20%', right: '15%', width: '80px', height: '80px', backgroundColor: 'var(--color-hot-pink)', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', zIndex: 1 }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
        style={{ position: 'absolute', top: '40%', right: '5%', width: '100px', height: '20px', backgroundColor: 'var(--color-spring-green)', transform: 'rotate(45deg)', zIndex: 9999 }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, 15, 0], rotate: [15, -15, 15] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1.5 }}
        style={{ position: 'absolute', bottom: '10%', left: '20%', width: '60px', height: '60px', backgroundColor: 'var(--color-periwinkle)', zIndex: 9999 }} 
      />
    </section>
  );
}

function TimelineSection() {
  const steps = [
    { title: "Enroll", desc: "Join your batches." },
    { title: "Study", desc: "Read and learn." },
    { title: "Quizzes", desc: "Test knowledge." },
    { title: "Progress", desc: "View analytics." }
  ];
  
  return (
    <section className="max-w-screen" style={{ padding: '120px 24px' }}>
      <h2 className="text-heading-lg" style={{ textAlign: 'center', marginBottom: '80px' }}>How It Works</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {steps.map((step, i) => (
          <motion.div 
            key={i} 
            initial={{ y: 15, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            style={{ backgroundColor: 'var(--color-paper-white)', padding: '32px', borderRadius: 'var(--radius-cards)', border: '1px solid var(--color-ink)' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '5px', backgroundColor: 'var(--color-sun-yellow)', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid var(--color-ink)' }}>
              <span className="text-subheading">{i + 1}</span>
            </div>
            <h3 className="text-subheading" style={{ marginBottom: '12px' }}>{step.title}</h3>
            <p className="text-body">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    { q: "Can I take courses on mobile?", a: "Yes, our platform is fully responsive and works perfectly on mobile devices." },
    { q: "How are assignments graded?", a: "Assignments can be auto-graded or manually graded by professors with detailed feedback." },
    { q: "Can professors manage multiple classes?", a: "Yes, professors can create separate batches to organize students and track their progress independently." }
  ];

  return (
    <section className="max-w-screen" style={{ padding: '120px 24px', maxWidth: '800px' }}>
      <h2 className="text-heading" style={{ textAlign: 'center', marginBottom: '64px' }}>Frequently Asked Questions</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {faqs.map((faq, i) => (
          <Accordion key={i} question={faq.q} answer={faq.a} />
        ))}
      </div>
    </section>
  );
}

function Accordion({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div 
      onClick={() => setOpen(!open)}
      style={{ 
        backgroundColor: 'var(--color-paper-white)', borderRadius: 'var(--radius-cards)', 
        border: '1px solid var(--color-ink)', overflow: 'hidden', cursor: 'pointer' 
      }}
    >
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="text-body-lg">{question}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }}><ChevronDown size={20} /></motion.div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            style={{ padding: '0 24px 24px' }}
          >
            <span className="text-body">{answer}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FinalCTA() {
  return (
    <section className="max-w-screen" style={{ padding: '120px 24px', textAlign: 'center' }}>
      <Card color="lime" style={{ padding: '80px 40px', border: '1px solid var(--color-ink)' }}>
        <h2 className="text-heading-lg" style={{ color: 'var(--color-ink)', marginBottom: '24px' }}>Ready to Learn?</h2>
        <p className="text-body-lg" style={{ color: 'var(--color-ink)', maxWidth: '600px', margin: '0 auto 40px' }}>
          Join thousands of students and faculty experiencing the future of academic management.
        </p>
        <Link href="/register" style={{ textDecoration: 'none' }}>
          <Button variant="primary">
            Start Learning Today
          </Button>
        </Link>
      </Card>
    </section>
  );
}

function Footer() {
  const links = {
    Product: ['Features', 'Courses', 'Pricing'],
    Company: ['About', 'Contact', 'Privacy'],
    Resources: ['Documentation', 'Support', 'GitHub']
  };

  return (
    <footer style={{ backgroundColor: 'var(--color-paper-white)', borderTop: '1px solid var(--color-ink)', padding: '80px 24px 40px' }}>
      <div className="max-w-screen" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '48px', marginBottom: '80px' }}>
        <div>
          <div className="text-subheading" style={{ marginBottom: '24px' }}>LMS</div>
          <p className="text-body">A premium academic learning management system.</p>
        </div>
        {Object.entries(links).map(([title, items]) => (
          <div key={title}>
            <h4 className="text-body-lg" style={{ marginBottom: '24px' }}>{title}</h4>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map(item => (
                <li key={item}><a href="#" className="text-body" style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>{item}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-screen" style={{ textAlign: 'center', borderTop: '1px solid var(--color-ink)', paddingTop: '40px' }}>
        <p className="text-caption">© 2026 LMS Platform. All rights reserved.</p>
      </div>
    </footer>
  );
}
