export default function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

        <div className="text-2xl font-bold tracking-wider text-yellow-400">
          STAGEFRONT
        </div>

        <div className="hidden gap-8 text-sm text-white md:flex">
          <a href="#">Discover</a>
          <a href="#">Golden Voices</a>
          <a href="#">Original Artists</a>
          <a href="#">Community</a>
          <a href="#">About</a>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden text-sm text-white md:block">
            Sign In
          </button>

          <button className="rounded-full bg-yellow-400 px-5 py-2 text-sm font-bold text-black transition hover:bg-yellow-300">
            Founding Member
          </button>
        </div>

      </div>
    </nav>
  );
}