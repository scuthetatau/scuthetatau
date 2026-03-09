import React, { useEffect, useRef } from 'react';
import './AboutUs.css';

// Import assets
import ThetaClassInitiation from '../assets/ThetaClassInitiation.png';
import SillyChapterPhoto from '../assets/SillyChapterPhoto.jpeg';
import ThetaClassMeeting from '../assets/ThetaClassMeeting.jpeg';
import Retreat2024 from '../assets/Retreat2024.jpeg';
import Retreat2025 from '../assets/Retreat2025.jpeg';
import IotaClass from '../assets/IotaClass.JPG';
import ThetaClass from '../assets/ThetaClass.jpeg';
import UpsilonEpsilonThetaTau from '../assets/UpsilonEpsilonThetaTau.png';

const AboutUs = () => {
    // Intersection Observer for scroll animations
    useEffect(() => {
        const observerOptions = {
            threshold: 0.1
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in-section').forEach(section => {
            observer.observe(section);
        });

        // Parallax Effect (borrowed from Rush.js)
        const handleScroll = () => {
            const scrolled = window.pageYOffset;
            const heroText = document.getElementById('hero-text');
            if (heroText) {
                heroText.style.opacity = 1 - (scrolled / 700);
            }
        };

        window.addEventListener('scroll', handleScroll);

        // Cleanup
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <div className="bg-background-light dark:bg-background-dark font-sans text-charcoal dark:text-gray-200 transition-colors duration-300">
            {/* Hero Section */}
            <header className="relative h-screen flex items-center justify-center overflow-hidden">
                <img
                    alt="Brotherhood Hero"
                    className="absolute inset-0 w-full h-full object-cover"
                    src={ThetaClassInitiation}
                />
                <div className="absolute inset-0 bg-black/40 dark:bg-black/60"></div>
                <div className="relative z-10 text-center text-white px-4">
                    <h1 className="font-anton text-7xl md:text-9xl uppercase tracking-tighter leading-none mb-4 drop-shadow-2xl" id="hero-text">
                        ABOUT <span className="text-accent">US</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 font-playfair italic tracking-wide max-w-2xl mx-auto opacity-90">
                        Developing engineering leaders through brotherhood, professionalism, and service since 1904.
                    </p>
                </div>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
                    <span className="material-icons-outlined text-white text-4xl">expand_more</span>
                </div>
            </header>

            {/* Chapter History Section */}
            <section className="py-24 px-6 max-w-5xl mx-auto">
                <div className="text-center mb-16 fade-in-section">
                    <h2 className="font-anton text-5xl text-primary dark:text-gold mb-2">CHAPTER HISTORY</h2>
                    <div className="h-1 w-20 bg-primary dark:bg-gold mx-auto"></div>
                </div>
                <div className="relative">
                    <div className="absolute left-1/2 -translate-x-1/2 h-full timeline-line hidden md:block"></div>

                    {/* 1904 */}
                    <div className="flex flex-col md:flex-row items-center mb-24 fade-in-section">
                        <div className="md:w-1/2 md:pr-12 text-center md:text-right order-2 md:order-1">
                            <h3 className="font-anton text-4xl text-primary dark:text-gold mb-2">1904</h3>
                            <h4 className="text-xl font-bold mb-3 uppercase">Inception of National Theta Tau</h4>
                            <p className="text-gray-600 dark:text-gray-400">
                                Theta Tau was founded as the "Society of Hammer and Tongs" on October 15, 1904, by four engineering students at the University of Minnesota. It has since grown into the nation's largest professional engineering fraternity.
                            </p>
                        </div>
                        <div className="relative z-10 w-4 h-4 rounded-full bg-primary ring-8 ring-primary/20 mb-8 md:mb-0 order-1 md:order-2"></div>
                        <div className="md:w-1/2 md:pl-12 order-3"></div>
                    </div>

                    {/* 2016 */}
                    <div className="flex flex-col md:flex-row items-center mb-24 fade-in-section">
                        <div className="md:w-1/2 md:pr-12 order-3 md:order-1"></div>
                        <div className="relative z-10 w-4 h-4 rounded-full bg-primary ring-8 ring-primary/20 mb-8 md:mb-0 order-1 md:order-2"></div>
                        <div className="md:w-1/2 md:pl-12 text-center md:text-left order-2 md:order-3">
                            <h3 className="font-anton text-4xl text-primary dark:text-gold mb-2">2016</h3>
                            <h4 className="text-xl font-bold mb-3 uppercase">Upsilon Epsilon Colony Formed</h4>
                            <p className="text-gray-600 dark:text-gray-400">
                                The Upsilon Epsilon Colony of Theta Tau was established at Santa Clara University, marking the fraternity's introduction to this prestigious engineering community.
                            </p>
                        </div>
                    </div>

                    {/* 2020 */}
                    <div className="flex flex-col md:flex-row items-center fade-in-section">
                        <div className="md:w-1/2 md:pr-12 text-center md:text-right order-2 md:order-1">
                            <h3 className="font-anton text-4xl text-primary dark:text-gold mb-2">2020</h3>
                            <h4 className="text-xl font-bold mb-3 uppercase">Upsilon Epsilon Becomes a Chapter</h4>
                            <p className="text-gray-600 dark:text-gray-400">
                                After years of growth and commitment, the colony officially received recognition as a full chapter of Theta Tau, solidifying its place in the national framework.
                            </p>
                        </div>
                        <div className="relative z-10 w-4 h-4 rounded-full bg-primary ring-8 ring-primary/20 mb-8 md:mb-0 order-1 md:order-2"></div>
                        <div className="md:w-1/2 md:pl-12 order-3"></div>
                    </div>
                </div>
            </section>

            {/* Life at Theta Tau Section */}
            <section className="py-24 bg-gray-100 dark:bg-charcoal/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-12 fade-in-section">
                        <div>
                            <h2 className="font-anton text-5xl text-primary dark:text-gold">LIFE AT THETA TAU</h2>
                            <p className="text-lg opacity-70">A glimpse into our professional and social journey.</p>
                        </div>
                        {/*THESE BUTTONS ARE UNUSED, BUT IN THE FUTURE IT MIGHT BE COOL TO SORT PHOTOS BASED ON PILLARS*/}
                        {/*<div className="flex gap-4 mt-6 md:mt-0 font-anton text-lg tracking-widest overflow-x-auto pb-2 w-full md:w-auto">*/}
                        {/*    <button className="px-6 py-2 bg-primary text-white rounded-full">ALL</button>*/}
                        {/*    <button className="px-6 py-2 border border-primary dark:border-gold hover:bg-primary hover:text-white transition-all rounded-full">SOCIAL</button>*/}
                        {/*    <button className="px-6 py-2 border border-primary dark:border-gold hover:bg-primary hover:text-white transition-all rounded-full">PROFESSIONAL</button>*/}
                        {/*    <button className="px-6 py-2 border border-primary dark:border-gold hover:bg-primary hover:text-white transition-all rounded-full">SERVICE</button>*/}
                        {/*</div>*/}
                    </div>
                    <div className="masonry-grid">
                        <div className="masonry-item tall">
                            <img alt="Campus Life" src={SillyChapterPhoto} />
                        </div>
                        <div className="masonry-item wide">
                            <img alt="Professional Workshop" src={ThetaClassMeeting} />
                        </div>
                        <div className="masonry-item">
                            <img alt="Social Gathering" src={Retreat2024} />
                        </div>
                        <div className="masonry-item">
                            <img alt="Team Building" src={Retreat2025} />
                        </div>
                        {/*<div className="masonry-item wide">*/}
                        {/*    <img alt="Networking Event" src={IotaClass} />*/}
                        {/*</div>*/}
                        {/*<div className="masonry-item tall">*/}
                        {/*    <img alt="Study Session" src={ThetaClass} />*/}
                        {/*</div>*/}
                    </div>
                </div>
            </section>

            {/* National Heritage Section */}
            <section className="flex flex-col md:flex-row min-h-[600px]">
                <div className="md:w-1/2 relative overflow-hidden group">
                    <img
                        alt="National History"
                        className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000"
                        src={IotaClass}
                    />
                    <div className="absolute inset-0 bg-about-primary/20 mix-blend-multiply"></div>
                </div>
                <div className="md:w-1/2 bg-white dark:bg-background-dark p-12 md:p-24 flex flex-col justify-center fade-in-section">
                    <span className="text-primary dark:text-gold font-anton text-2xl tracking-widest mb-4">NATIONAL HERITAGE</span>
                    <h2 className="font-anton text-6xl mb-8 leading-none">THE FOUNDING PRINCIPLES</h2>
                    <div className="space-y-6 text-lg text-gray-600 dark:text-gray-400">
                        <p>
                            Theta Tau was originally founded as the Society of Hammer and Tongs on October 15, 1904 by four engineering students at the University of Minnesota in Minneapolis. Since its founding, Theta Tau has initiated over 50,000 members.
                        </p>
                        <p>
                            Today, Theta Tau is the nation's oldest, largest, and foremost fraternity for engineers. The support and guidance of Theta Tau's vast resources and network helps to foster lifelong relationships between brothers that extend into many professional disciplines.
                        </p>
                        <div className="pt-8">
                            <h3 className="font-anton text-3xl text-primary dark:text-gold mb-2">NORTHWESTERN REGION</h3>
                            <p>
                                The Upsilon Epsilon Chapter belongs to the Northwestern Region of Theta Tau, currently consisting of 7 active and thriving chapters.
                            </p>
                        </div>
                        <a
                            className="inline-flex items-center gap-2 font-anton text-xl tracking-widest text-primary dark:text-gold hover:translate-x-2 transition-transform"
                            href="https://thetatau.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            LEARN MORE <span className="material-icons-outlined">arrow_forward</span>
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AboutUs;
