import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Shield, Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const handlePortalClick = (role: string) => {
    navigate("/login", { state: { role } });
  };

  const features = [
    // { num: "01", title: "Course materials", desc: "Access lecture notes, slides, and resources uploaded by your teachers — anytime, from anywhere." },
    { num: "01", title: "Assignments & deadlines", desc: "Submit work, track due dates, and receive feedback — all in one streamlined workflow." },
    { num: "02", title: "Tests & grading", desc: "Take online tests, view scores, and let teachers grade submissions with full visibility into results." },
  ];

  const portals = [
    { role: "student", icon: BookOpen, title: "Student", desc: "Access courses, submit assignments, take tests, and track your academic progress." },
    { role: "teacher", icon: Users, title: "Teacher", desc: "Upload materials, create tests, grade submissions, and manage your courses." },
    // { role: "admin", icon: Shield, title: "Admin", desc: "Manage users, oversee courses, broadcast announcements, and monitor analytics." },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_hsl(142_76%_45%_/_0.3)]">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">NACOS CONNECT '26 V1</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-secondary"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="text-sm bg-primary text-primary-foreground font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Sign up
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-primary font-medium">Welcome to NACOS</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight"
          >
            Your Gateway to
            <span className="block text-primary">Academic Excellence</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Connect with your courses, teachers, and fellow students.
            Manage assignments, access resources, and stay updated — all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center gap-4 mb-16"
          >
            <button
              onClick={() => navigate("/signup")}
              className="bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-xl text-base hover:bg-primary/90 transition-colors"
            >
              Get started
            </button>
            <button
              onClick={() => navigate("/login")}
              className="border border-border text-foreground px-8 py-3 rounded-xl text-base hover:bg-secondary transition-colors"
            >
              Log in
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex justify-center gap-12"
          >
            {[
              { value: "500+", label: "Students" },
              { value: "50+", label: "Courses" },
              { value: "30+", label: "Teachers" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-display font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* Features */}
      <section className="relative z-10 py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-4">What's included</p>
            <h2 className="text-4xl font-display font-bold mb-3">Built by NACOS students<br />for NACOS students</h2>
            <p className="text-muted-foreground text-base mb-12 max-w-lg">
              Everything your department needs — from submitting assignments to grading, all in one platform.
            </p>
          </motion.div>

          <div className="flex flex-col">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.08 }}
                className="flex items-start gap-6 py-6 border-t border-border/30 last:border-b last:border-border/30"
              >
                <span className="text-xs font-semibold text-primary/50 min-w-[28px] pt-0.5">{f.num}</span>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* CTA */}
      <div className="border-t border-border/30" />
      <section className="relative z-10 py-20 px-4 text-center">
        <div className="container mx-auto max-w-xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.9 }}>
            <h2 className="text-4xl font-display font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-8 text-base leading-relaxed">
              Join hundreds of KDU NACOS students already using the platform.
            </p>
            <button
              onClick={() => navigate("/signup")}
              className="bg-primary text-primary-foreground font-semibold px-10 py-3 rounded-xl text-base hover:bg-primary/90 transition-colors"
            >
              Create your account
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-6 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground">KDU NACOS CONNECT</span>
          </div>
          <span className="text-xs text-muted-foreground">NACOS Department Portal</span>
        </div>
        <p className="mt-6 text-center text-[15px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
          Built by Shady
        </p>
      </footer>
    </div>
  );
};

export default Index;