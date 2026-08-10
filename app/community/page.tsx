import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CommunityFeed from "@/components/CommunityFeed";

export const metadata:Metadata={title:"Community | StageFront",description:"Share updates, encourage performers, and connect with the StageFront singing community."};
export default function CommunityPage(){return <main className="min-h-screen bg-[#070708] px-5 pb-24 pt-32 text-white sm:px-8"><Navbar/><div className="mx-auto max-w-3xl"><p className="section-kicker">The StageFront community</p><h1 className="mt-4 font-display text-5xl font-black uppercase sm:text-7xl">Your music. <span className="text-stage-gold">Your people.</span></h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">Share what you are singing, celebrate other members, find collaborators, and keep the conversation going beyond the stage.</p><CommunityFeed/></div></main>}
