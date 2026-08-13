import React from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import { ArrowRight, BookOpen, PenTool, LayoutDashboard } from 'lucide-react';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 48px',
        backgroundColor: 'var(--color-warm-linen)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-sun-yellow)' }} />
          <div className="text-body" style={{ fontWeight: 400 }}>LMS Platform</div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Button variant="ghost">Sign up</Button>
          <Button variant="primary">Log in</Button>
        </div>
      </nav>

      <main style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Hero Section */}
        <section style={{
          padding: '64px 48px 160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          backgroundColor: 'var(--color-pure-white)',
          position: 'relative'
        }}>
          <motion.p 
            className="text-subheading"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ color: 'var(--color-charcoal)', maxWidth: '600px', margin: '0 auto 24px' }}
          >
            The Complete Academic Learning Lifecycle
          </motion.p>
          
          <motion.h1 
            className="text-display"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
            style={{ color: 'var(--color-ink)', maxWidth: '1000px', margin: '0 auto 64px' }}
          >
            Learn Without Friction
          </motion.h1>

          {/* Collage Image Container */}
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 150, damping: 25, delay: 0.2 }}
            style={{ position: 'relative', maxWidth: '800px', width: '100%', margin: '0 auto', zIndex: 10, display: 'flex', justifyContent: 'center' }}
          >
            {/* Scrapbook Decorative Accents */}
            <motion.div 
              drag
              dragConstraints={{ left: -50, right: 50, top: -50, bottom: 50 }}
              whileHover={{ scale: 1.1, rotate: -15 }}
              whileDrag={{ scale: 1.2 }}
              style={{
                position: 'absolute',
                top: '-20px',
                left: '20px',
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-sun-yellow)',
                zIndex: 1,
                cursor: 'grab'
              }}
            />
            
            <motion.div 
              drag
              dragConstraints={{ left: -50, right: 50, top: -50, bottom: 50 }}
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileDrag={{ scale: 1.2 }}
              className="hairline-border"
              style={{
                position: 'absolute',
                bottom: '-30px',
                right: '40px',
                width: '60px',
                height: '60px',
                backgroundColor: 'var(--color-bubblegum)',
                zIndex: 20,
                cursor: 'grab',
                transform: 'rotate(15deg)'
              }}
            />

            {/* Foreground Primary Image */}
            <motion.img 
              src="/img/main_img.png" 
              alt="LMS Platform Showcase"
              whileHover={{ y: -5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                position: 'relative',
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'rgba(115, 115, 115, 0.16) 0px 10px 30px 0px, rgba(115, 115, 115, 0.12) 0px 4px 8px 0px',
                zIndex: 10,
                cursor: 'pointer'
              }}
            />
          </motion.div>
        </section>

        {/* Dark Editorial Section */}
        <section className="bg-charcoal" style={{
          padding: '120px 48px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          
          {/* Floating Accents */}
          <motion.div 
            drag
            dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
            whileDrag={{ scale: 1.1 }}
            className="hairline-border"
            style={{
              position: 'absolute',
              top: '20%',
              left: '15%',
              width: '80px',
              height: '80px',
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'var(--color-hot-pink)',
              cursor: 'grab'
            }}
          />
          <motion.div 
            drag
            dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
            whileDrag={{ scale: 1.1 }}
            className="hairline-border"
            style={{
              position: 'absolute',
              bottom: '20%',
              right: '15%',
              width: '120px',
              height: '40px',
              borderRadius: 'var(--radius-button)',
              backgroundColor: 'var(--color-lime-burst)',
              cursor: 'grab'
            }}
          />

          <motion.h2 
            className="text-heading-lg"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ color: 'var(--color-paper-white)', maxWidth: '800px', margin: '0 auto 24px' }}
          >
            Built for Your Learning
          </motion.h2>

          <motion.p 
            className="text-body-lg"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
            style={{ color: 'var(--color-paper-white)', maxWidth: '600px', margin: '0 auto' }}
          >
            Enroll in courses, dive into rich study materials, and track your performance effortlessly.
            Everything you need for a focused academic journey in one place.
          </motion.p>
        </section>

        {/* Features Collage */}
        <section className="bg-linen" style={{
          padding: '120px 48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          
          <FeatureCard 
            icon={<BookOpen size={32} />}
            title="Explore Curriculum"
            desc="Seamlessly navigate through your enrolled courses, modules, and curated study materials."
            bgColor="var(--color-lime-burst)"
            delay={0}
          />
          
          <FeatureCard 
            icon={<PenTool size={32} />}
            title="Interactive Assessments"
            desc="Submit assignments and attempt auto-graded quizzes in a distraction-free environment."
            bgColor="var(--color-periwinkle)"
            delay={0.1}
          />
          
          <FeatureCard 
            icon={<LayoutDashboard size={32} />}
            title="Personalized Dashboards"
            desc="Monitor your progress, upcoming deadlines, and grading status instantly with fluid analytics."
            bgColor="var(--color-sun-yellow)"
            delay={0.2}
          />
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '48px',
        borderTop: '1px solid var(--color-ink)',
        textAlign: 'center',
        backgroundColor: 'var(--color-warm-linen)'
      }}>
        <div className="text-body">
          LMS Academic Platform © 2026.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay, bgColor }) {
  return (
    <Card 
      bgColor={bgColor}
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay }}
      whileHover={{ y: -5 }}
    >
      <div style={{ color: 'var(--color-ink)', marginBottom: '16px' }}>{icon}</div>
      <h3 className="text-heading" style={{ marginBottom: '16px' }}>{title}</h3>
      <p className="text-body" style={{ color: 'var(--color-ink)' }}>{desc}</p>
    </Card>
  );
}
