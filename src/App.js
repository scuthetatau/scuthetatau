import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home/Home';
import AboutUs from './components/AboutUs/AboutUs';
import MeetTheBrothers from './components/MeetTheBrothers/MeetTheBrothers';
import Alumni from './components/Alumni';
import Rush from './components/Rush/Rush';
import Login from './components/Login/Login';
import Header from './components/Header/Header';
import Admin from './components/Admin/Admin';
import UserManagement from './components/Admin/UserManagement';
import ManageBroDates from './components/Admin/ManageBroDates';
import SpoonAssassins from './components/Admin/SpoonAssassins';
import FamilyTree from './components/FamilyTree';
import Directory from './components/Directory/Directory';
import './components/Footer.css';
import Dashboard from "./components/Dashboard/Dashboard";
import ScribeEditor from "./components/ScribeEditor/ScribeEditor";
// Vercel Imports (analytics)
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

function App() {
    return (
        <Router>
            <div>
                <Header />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about-us" element={<AboutUs />} />
                    <Route path="/meet-the-brothers" element={<MeetTheBrothers />} />
                    <Route path="/rush" element={<Rush />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/user-management" element={<UserManagement />} />
                    <Route path="/admin/bro-dates" element={<ManageBroDates />} />
                    <Route path="/admin/spoon-assassins" element={<SpoonAssassins />} />
                    <Route path="/alumni" element={<Alumni />} />
                    <Route path="/directory" element={<Directory />} />

                    <Route path="/dashboard" element={<Dashboard />} />

                    <Route path="/scribe-editor" element={<ScribeEditor />} />
                    <Route path="/family-tree" element={<FamilyTree />} />
                </Routes>
            </div>
            <footer className="footer">
                <p>&copy; {new Date().getFullYear()} Upsilon Epsilon Chapter of Theta Tau. All rights reserved.</p>
            </footer>
            <SpeedInsights />
            <Analytics debug={true} />

        </Router>
    );
}

export default App;