import React, { useEffect, useState } from 'react';
import KappaClass from '../assets/KappaClass.JPG';
import rushInfoNight from '../assets/Rush_Info_Night_2026.JPG';
import './Rush.css';

const Rush = () => {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    useEffect(() => {
        // Countdown Logic for Rush 2027 (Jan 6, 2027)
        const targetDate = new Date('January 6, 2027 18:00:00').getTime();

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const difference = targetDate - now;

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((difference % (1000 * 60)) / 1000)
                });
            } else {
                clearInterval(timer);
            }
        }, 1000);

        // Scroll Reveal
        const observerOptions = {
            threshold: 0.1
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

        // Parallax
        const handleScroll = () => {
            const scrolled = window.pageYOffset;
            const heroText = document.getElementById('hero-text');
            if (heroText) {
                heroText.style.opacity = 1 - (scrolled / 700);
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            // Cleanup
            clearInterval(timer);
            observer.disconnect();
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div className="bg-background-light dark:bg-background-dark text-charcoal dark:text-gray-200 font-sans">
            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-black">
                    <img
                        alt="Fraternity Group Hero Background"
                        className="w-full h-full object-cover opacity-60 scale-110"
                        src={KappaClass}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
                </div>
                <div className="relative z-10 text-center px-4">
                    <h1 className="font-anton text-7xl md:text-9xl text-white uppercase tracking-tighter leading-none mb-4 drop-shadow-2xl" id="hero-text">
                        RUSH <span className="text-accent">2027</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 font-playfair italic mb-8 reveal active">Excellence through Brotherhood.</p>

                    {/* Countdown Timer */}
                    <div className="flex gap-4 md:gap-8 justify-center mb-12 reveal active" style={{ transitionDelay: "200ms" }}>
                        <div className="text-center countdown-unit">
                            <div className="text-4xl md:text-6xl font-anton text-white">{timeLeft.days}</div>
                            <div className="text-xs md:text-sm text-accent uppercase tracking-widest font-bold">Days</div>
                        </div>
                        <div className="text-4xl md:text-6xl font-anton text-white flex items-center">:</div>
                        <div className="text-center countdown-unit">
                            <div className="text-4xl md:text-6xl font-anton text-white">{timeLeft.hours}</div>
                            <div className="text-xs md:text-sm text-accent uppercase tracking-widest font-bold">Hours</div>
                        </div>
                        <div className="text-4xl md:text-6xl font-anton text-white flex items-center">:</div>
                        <div className="text-center countdown-unit">
                            <div className="text-4xl md:text-6xl font-anton text-white">{timeLeft.minutes}</div>
                            <div className="text-xs md:text-sm text-accent uppercase tracking-widest font-bold">Mins</div>
                        </div>
                        <div className="text-4xl md:text-6xl font-anton text-white flex items-center">:</div>
                        <div className="text-center countdown-unit">
                            <div className="text-4xl md:text-6xl font-anton text-white">{timeLeft.seconds}</div>
                            <div className="text-xs md:text-sm text-accent uppercase tracking-widest font-bold">Secs</div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center reveal active" style={{ transitionDelay: "400ms" }}>
                        {/* 
                        <a className="group relative px-8 py-4 bg-accent text-black font-bold uppercase tracking-widest rounded-sm overflow-hidden transition-all hover:pr-12" href="https://forms.gle/jveLESqs2rSRiBsN8" target="_blank" rel="noreferrer">
                            <span className="relative z-10">Application Open</span>
                            <span className="material-icons-outlined absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all">arrow_forward</span>
                        </a>
                        <a className="px-8 py-4 border-2 border-white text-white font-bold uppercase tracking-widest rounded-sm hover:bg-white hover:text-black transition-all" href="#schedule">
                            View Schedule
                        </a>
                        */}
                    </div>
                </div>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
                    <span className="material-icons-outlined text-white opacity-50 text-4xl">expand_more</span>
                </div>
            </section>

            {/* What is Rush Section */}
            <section className="py-24 px-6 md:px-24">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div className="reveal">
                        <h2 className="text-primary font-anton text-5xl md:text-6xl mb-6">WHAT IS RUSH?</h2>
                        <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400 mb-6">
                            Rush is a series of events designed to introduce potential new members to the fraternity. During Rush, you will have the opportunity to meet current fraternity members, learn about our values, and get a sense of what life in Theta Tau is like.
                        </p>
                        <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                            It's a great way to find out if our brotherhood is the right fit for you, and for us to get to know you better as well. Join a community of professional engineers dedicated to service, integrity, and lifelong friendship.
                        </p>
                    </div>
                    <div className="relative reveal h-96 md:h-[500px]" style={{ transitionDelay: "300ms" }}>
                        <div className="absolute inset-0 border-2 border-accent translate-x-4 translate-y-4"></div>
                        <img alt="Engineering Students Collaborating" className="relative w-full h-full object-cover shadow-2xl" src={rushInfoNight} />
                    </div>
                </div>
            </section>

            {/* Schedule Section */}
            <section className="py-24 bg-zinc-100 dark:bg-charcoal px-6" id="schedule">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16 reveal">
                        <h2 className="text-primary font-anton text-5xl md:text-6xl mb-2">RUSH SCHEDULE</h2>
                        <p className="text-gray-500 uppercase tracking-widest font-semibold">Mark Your Calendars</p>
                    </div>
                    <div className="relative">
                        <div className="absolute left-1/2 -translate-x-1/2 h-full w-1 timeline-line opacity-20 hidden md:block"></div>
                        <div className="space-y-12">
                            {/* Event 1 */}
                            <div className="relative flex flex-col md:flex-row items-center reveal">
                                <div className="md:w-1/2 md:pr-12 md:text-right mb-4 md:mb-0">
                                    <span className="text-primary font-bold text-xl">WEEK 1</span>
                                    <h3 className="text-2xl font-anton text-charcoal dark:text-white">THETA TAU INFO NIGHT</h3>
                                    <p className="text-accent font-semibold">Wednesday 1/07 · 6-9pm</p>
                                </div>
                                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 bg-primary rounded-full items-center justify-center z-10 border-4 border-background-light dark:border-charcoal">
                                    <span className="material-icons-outlined text-white text-sm">info</span>
                                </div>
                                <div className="md:w-1/2 md:pl-12">
                                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl event-card">
                                        <p className="text-sm text-gray-500 mb-2 font-semibold">LOCATION: DALY 207</p>
                                        <p className="dark:text-gray-300">Learn about what Theta Tau has to offer and meet the executive board.</p>
                                    </div>
                                </div>
                            </div>
                            {/* Event 2 */}
                            <div className="relative flex flex-col md:flex-row-reverse items-center reveal" style={{ transitionDelay: "100ms" }}>
                                <div className="md:w-1/2 md:pl-12 mb-4 md:mb-0">
                                    <span className="text-primary font-bold text-xl">WEEK 1</span>
                                    <h3 className="text-2xl font-anton text-charcoal dark:text-white uppercase">Meet the Actives</h3>
                                    <p className="text-accent font-semibold">Thursday 1/08 · 6-9pm</p>
                                </div>
                                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 bg-primary rounded-full items-center justify-center z-10 border-4 border-background-light dark:border-charcoal">
                                    <span className="material-icons-outlined text-white text-sm">groups</span>
                                </div>
                                <div className="md:w-1/2 md:pr-12">
                                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl event-card">
                                        <p className="text-sm text-gray-500 mb-2 font-semibold">LOCATION: VARI 129/133/135</p>
                                        <p className="dark:text-gray-300">Chat with active brothers in an informal setting and get to know them personally.</p>
                                    </div>
                                </div>
                            </div>
                            {/* Event 3 */}
                            <div className="relative flex flex-col md:flex-row items-center reveal" style={{ transitionDelay: "200ms" }}>
                                <div className="md:w-1/2 md:pr-12 md:text-right mb-4 md:mb-0">
                                    <span className="text-primary font-bold text-xl">WEEK 1</span>
                                    <h3 className="text-2xl font-anton text-charcoal dark:text-white uppercase">Innovation Night</h3>
                                    <p className="text-accent font-semibold">Friday 1/09 · 5:30-9pm</p>
                                </div>
                                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 bg-primary rounded-full items-center justify-center z-10 border-4 border-background-light dark:border-charcoal">
                                    <span className="material-icons-outlined text-white text-sm">lightbulb</span>
                                </div>
                                <div className="md:w-1/2 md:pl-12">
                                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl event-card">
                                        <p className="text-sm text-gray-500 mb-2 font-semibold">LOCATION: LOCATELLI</p>
                                        <p className="dark:text-gray-300">Engage with peers, show your engineering skills, and participate in collaborative challenges.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Invite Only Divider */}
                            <div className="pt-12 text-center reveal">
                                <div className="inline-block bg-accent/10 border border-accent text-accent px-6 py-2 rounded-full font-bold uppercase tracking-widest text-sm mb-8">
                                    Invite Only Events
                                </div>
                            </div>

                            {/* Invite Only 1 */}
                            <div className="relative flex flex-col md:flex-row-reverse items-center reveal" style={{ transitionDelay: "100ms" }}>
                                <div className="md:w-1/2 md:pl-12 mb-4 md:mb-0">
                                    <span className="text-primary font-bold text-xl">WEEK 2</span>
                                    <h3 className="text-2xl font-anton text-charcoal dark:text-white uppercase">Coffee Chats</h3>
                                    <p className="text-accent font-semibold italic">Invitation Only</p>
                                </div>
                                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 bg-accent rounded-full items-center justify-center z-10 border-4 border-background-light dark:border-charcoal">
                                    <span className="material-icons-outlined text-black text-sm">coffee</span>
                                </div>
                                <div className="md:w-1/2 md:pr-12">
                                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl border-l-4 border-accent">
                                        <p className="dark:text-gray-300">Deeper one-on-one conversations with brothers. Details provided via email.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Invite Only 2 */}
                            <div className="relative flex flex-col md:flex-row items-center reveal" style={{ transitionDelay: "200ms" }}>
                                <div className="md:w-1/2 md:pr-12 md:text-right mb-4 md:mb-0">
                                    <span className="text-primary font-bold text-xl">WEEK 2</span>
                                    <h3 className="text-2xl font-anton text-charcoal dark:text-white uppercase">Interviews</h3>
                                    <p className="text-accent font-semibold italic">Invitation Only</p>
                                </div>
                                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 bg-accent rounded-full items-center justify-center z-10 border-4 border-background-light dark:border-charcoal">
                                    <span className="material-icons-outlined text-black text-sm">assignment_ind</span>
                                </div>
                                <div className="md:w-1/2 md:pl-12">
                                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl border-r-4 md:border-r-0 md:border-l-4 border-accent">
                                        <p className="dark:text-gray-300">Formal professional interviews. Dress code: Business Professional.</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Rush;
