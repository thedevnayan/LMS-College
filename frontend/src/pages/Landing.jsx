import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import { 
  ArrowRight, Play, BookOpen, FileText, CheckSquare, 
  BarChart, Cpu, Calendar, CheckCircle2, ChevronDown, Folder
} from 'lucide-react';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
      padding: '16px 24px', backgroundColor: 'var(--color-warm-linen)',
      borderBottom: '1px solid var(--color-ink)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        {/* Menu Button as per spec: Black fill, white text, 5px radius */}
        <Button variant="nav">LMS</Button>
        <div style={{ display: 'flex', gap: '24px' }}>
          {['For Students', 'For Teachers'].map(link => (
            <a key={link} href="#" className="text-body" style={{ textDecoration: 'none', color: 'var(--color-ink)' }}>
              {link}
            </a>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Button variant="ghost">Log in</Button>
        <Button variant="primary">Book a demo</Button>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="max-w-screen" style={{ paddingTop: '160px', paddingBottom: '120px', textAlign: 'center', position: 'relative' }}>
      <motion.p 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="text-subheading" style={{ color: 'var(--color-ink)', marginBottom: '24px', position: 'relative', zIndex: 10 }}
      >
        A way better way of working
      </motion.p>
      
      <motion.h1 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
        className="text-display" style={{ color: 'var(--color-ink)', marginBottom: '60px', position: 'relative', zIndex: 10, maxWidth: '1000px', margin: '0 auto 60px', lineHeight: '1.1' }}
      >
        Learn <span style={{ fontFamily: '"Octagon Calligraphy", cursive', display: 'inline-block', transform: 'rotate(-2deg)', fontSize: '1.2em', position: 'relative', top: '12px', padding: '0 12px' }}>Without</span><br/>Friction
      </motion.h1>
      
      {/* Interactive Decorative Atmosphere Shapes */}
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        style={{ position: 'absolute', top: '100px', left: '15%', width: '60px', height: '60px', backgroundColor: 'var(--color-hot-pink)', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', zIndex: 9999 }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
        style={{ position: 'absolute', top: '220px', right: '15%', width: '80px', height: '80px', backgroundColor: 'var(--color-lime-burst)', borderRadius: '50%', zIndex: 9999 }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
        style={{ position: 'absolute', bottom: '40px', left: '25%', width: '100px', height: '24px', backgroundColor: 'var(--color-periwinkle)', zIndex: 9999 }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, 15, 0], rotate: [15, -15, 15] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1.5 }}
        style={{ position: 'absolute', top: '60px', right: '28%', width: '50px', height: '50px', backgroundColor: 'var(--color-sun-yellow)', borderRadius: '8px', zIndex: 9999 }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 2 }}
        style={{ position: 'absolute', bottom: '80px', right: '30%', width: '60px', height: '60px', backgroundColor: 'var(--color-bubblegum)', borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%', zIndex: 9999 }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut", delay: 0.8 }}
        style={{ position: 'absolute', top: '280px', left: '8%', width: '30px', height: '30px', backgroundColor: 'var(--color-spring-green)', borderRadius: '50%', zIndex: 9999 }} 
      />

      <motion.div 
        initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
        style={{ display: 'flex', gap: '16px', justifyContent: 'center', position: 'relative', zIndex: 10 }}
      >
        <Button variant="primary">
          Start Learning Today
        </Button>
        <Button variant="ghost">
          Watch Demo
        </Button>
      </motion.div>
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
    <section className="max-w-screen" style={{ padding: '120px 24px' }}>
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
    <section style={{ backgroundColor: 'var(--color-charcoal)', padding: '120px 24px', position: 'relative' }}>
      <div className="max-w-screen" style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="text-heading-lg" style={{ color: 'var(--color-paper-white)', marginBottom: '32px' }}>Meet Your AI Partner</h2>
          <p className="text-body-lg" style={{ color: 'var(--color-fog)', marginBottom: '40px' }}>
            An intelligent assistant built right into your dashboard to help you learn faster and retain more. Generate quizzes, summarize notes, and explain concepts instantly.
          </p>
          <Button variant="ghost" style={{ backgroundColor: 'transparent', borderColor: 'var(--color-paper-white)', color: 'var(--color-paper-white)' }}>
            Learn more about AI
          </Button>
        </div>
      </div>
      
      {/* Scattered Atmosphere (Interactive) */}
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        style={{ position: 'absolute', top: '10%', left: '10%', width: '120px', height: '120px', backgroundColor: 'var(--color-sun-yellow)', borderRadius: '50%', zIndex: 9999 }} 
      />
      <motion.div 
        drag dragConstraints={{ left: -150, right: 150, top: -150, bottom: 150 }}
        whileHover={{ scale: 1.1, cursor: 'grab' }} whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        animate={{ y: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
        style={{ position: 'absolute', bottom: '20%', right: '15%', width: '80px', height: '80px', backgroundColor: 'var(--color-hot-pink)', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', zIndex: 9999 }} 
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
        <Button variant="primary">
          Start Learning Today
        </Button>
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
