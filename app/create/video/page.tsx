import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import VideoStudio from "@/components/VideoStudio";

export default function VideoStudioPage() {
  return (
    <main className="min-h-screen bg-[#070708] text-white">
      <Navbar />
      <VideoStudio />
      <Footer />
    </main>
  );
}
