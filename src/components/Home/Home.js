import React, { useEffect } from 'react';
import './Home.css';
import backgroundImage from '../assets/HomePage_Hero.png';
import regentImage from '../assets/regent.jpeg';
import ChapterPhoto from '../assets/ChapterSilly2026.JPG';

const Home = () => {
    useEffect(() => {
        // Scroll Reveal Observer
        const observerOptions = {
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px"
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => observer.observe(el));

        // Parallax scroll effect
        const handleScroll = () => {
            const scrolled = window.pageYOffset;

            const heroContent = document.getElementById('hero-content');
            if (heroContent) {
                heroContent.style.opacity = 1 - (scrolled / 800);
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div className="bg-background-light dark:bg-background-dark text-charcoal dark:text-gray-200 font-sans overflow-x-hidden">
            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-black">
                    <img
                        alt="Fraternity Members and Campus Background"
                        className="w-full h-full object-cover opacity-50 scale-105"
                        src={backgroundImage}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background-dark"></div>
                </div>

                <div className="relative z-10 text-center px-4" id="hero-content">
                    <p className="text-accent font-semibold tracking-[0.3em] uppercase mb-4 reveal active">Santa Clara University</p>
                    <h1 className="font-anton text-8xl md:text-[11rem] text-white uppercase leading-none mb-2 drop-shadow-2xl" id="parallax-title">
                        THETA TAU
                    </h1>
                    <h2 className="text-2xl md:text-4xl text-white font-playfair italic mb-4 tracking-wider reveal active" style={{ transitionDelay: "200ms" }}>UPSILON EPSILON CHAPTER</h2>
                    <p className="text-lg md:text-xl text-gray-300 font-sans tracking-wide mb-10 reveal active" style={{ transitionDelay: "400ms" }}>Co-Ed Professional Engineering Fraternity</p>

                    <div className="flex flex-col md:flex-row gap-6 justify-center items-center reveal active" style={{ transitionDelay: "600ms" }}>
                        <a className="group relative px-10 py-4 bg-accent text-black font-bold uppercase tracking-widest rounded-sm overflow-hidden transition-all hover:scale-105" href="/rush">
                            <span className="relative z-10">Rush 2026</span>
                        </a>
                        <a className="px-10 py-4 border-2 border-white/30 text-white font-bold uppercase tracking-widest rounded-sm hover:bg-white hover:text-black transition-all glassmorphism" href="/about-us">
                            Learn More
                        </a>
                    </div>
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
                    <span className="material-symbols-outlined text-white/50 text-4xl">keyboard_double_arrow_down</span>
                </div>
            </section>

            {/* Regent Section */}
            <section className="py-32 px-6 md:px-24 bg-white dark:bg-charcoal overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-20 items-center">
                        <div className="reveal-left relative group">
                            <div className="absolute -inset-4 border-2 border-accent/30 translate-x-4 translate-y-4 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform"></div>
                            <img
                                alt="Regent of Theta Tau"
                                className="relative w-full aspect-[4/5] object-cover shadow-2xl rounded-sm"
                                src={regentImage}
                            />
                        </div>
                        <div className="reveal-right">
                            <h2 className="text-primary font-anton text-5xl md:text-7xl mb-8 leading-tight">A MESSAGE FROM<br />THE REGENT</h2>
                            <div className="space-y-6 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                                {/*<p className="font-semibold text-charcoal dark:text-white text-xl">Hi!</p>*/}
                                <p>Hi!</p>
                                <p>My name is Xander Fruin, and I'm currently a senior at SCU majoring in Mechanical Engineering with a minor in Aerospace Engineering, part of the Theta class. Theta Tau has been integral to my college journey, where I've been able to grow professionally and meet some of my closest friends.</p>
                                <p>Theta Tau stands out as a fraternity where excellence is nurtured in every aspect. Our members are not only dedicated to their academic and professional achievements, but they also bring a vibrant, engaging spirit to everything we do.</p>
                                <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
                                    <p className="font-bold text-primary italic">In H & T,</p>
                                    <p className="font-anton text-2xl mt-2 text-charcoal dark:text-white">Xander Fruin</p>
                                    <p className="text-sm uppercase tracking-widest text-accent font-bold">Regent | Upsilon Epsilon Chapter</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pillars Section */}
            <section className="py-32 bg-background-light dark:bg-background-dark px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 reveal">
                        <h2 className="text-primary font-anton text-6xl md:text-8xl mb-4">OUR CORE PILLARS</h2>
                        <div className="h-1.5 w-32 bg-accent mx-auto"></div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="pillar-card bg-white dark:bg-charcoal p-10 rounded-xl shadow-lg border-t-4 border-primary reveal" style={{ transitionDelay: "100ms" }}>
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-8">
                                <span className="material-symbols-outlined text-primary text-4xl">groups</span>
                            </div>
                            <h3 className="font-anton text-3xl mb-4 text-charcoal dark:text-white uppercase">Brotherhood</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                                We forge lifelong bonds of fraternal friendship, a journey that develops and delivers a network of lasting personal and professional relationships.
                            </p>
                            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-sm italic text-primary">"Excellence through brotherhood."</p>
                            </div>
                        </div>
                        <div className="pillar-card bg-white dark:bg-charcoal p-10 rounded-xl shadow-lg border-t-4 border-accent reveal" style={{ transitionDelay: "200ms" }}>
                            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-8">
                                <span className="material-symbols-outlined text-accent text-4xl">work</span>
                            </div>
                            <h3 className="font-anton text-3xl mb-4 text-charcoal dark:text-white uppercase">Professionalism</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                                We develop and nurture engineers with strong communication, problem-solving, collaboration, and leadership skills that we demonstrate in our profession.
                            </p>
                            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-sm italic text-accent">Career-ready leaders.</p>
                            </div>
                        </div>
                        <div className="pillar-card bg-white dark:bg-charcoal p-10 rounded-xl shadow-lg border-t-4 border-primary reveal" style={{ transitionDelay: "300ms" }}>
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-8">
                                <span className="material-symbols-outlined text-primary text-4xl">volunteer_activism</span>
                            </div>
                            <h3 className="font-anton text-3xl mb-4 text-charcoal dark:text-white uppercase">Service</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                                We are known for our service to our college, university, and the larger community. Our service projects create a unifying environment for learning.
                            </p>
                            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-sm italic text-primary">Giving back to SCU.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Join Section */}
            <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        alt="Entire Chapter Photo"
                        className="w-full h-full object-cover"
                        src={ChapterPhoto}
                    />
                    <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-[2px]"></div>
                </div>
                <div className="relative z-10 text-center px-6 reveal">
                    <h2 className="text-white font-anton text-5xl md:text-8xl mb-12 uppercase tracking-tighter">Interested in Joining?</h2>
                    <a className="glassmorphism px-12 py-6 text-white font-bold uppercase tracking-[0.3em] text-xl rounded-sm hover:bg-accent hover:text-black hover:border-accent transition-all duration-500 inline-block" href="/rush">
                        Join Rush Winter 2027
                    </a>
                </div>
            </section>
        </div>
    );
};

export default Home;