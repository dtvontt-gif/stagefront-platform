import Navbar from "@/components/Navbar";
import ResetPasswordForm from "@/components/ResetPasswordForm";
export default function ResetPasswordPage() { return <main className="min-h-screen bg-[#070708] px-5 pb-24 pt-32 text-white"><Navbar /><div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-center"><div><p className="section-kicker">Account recovery</p><h1 className="mt-4 font-display text-5xl font-black uppercase sm:text-7xl">Choose a new <span className="text-stage-gold">password.</span></h1></div><ResetPasswordForm /></div></main>; }
