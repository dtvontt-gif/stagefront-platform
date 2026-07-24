export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">

        <h1 className="text-5xl font-bold tracking-wide md:text-7xl">
          STAGEFRONT
        </h1>

        <h2 className="mt-8 max-w-4xl text-3xl font-bold md:text-5xl">
          WE DON'T BUILD STARS.
          <br />
          WE BUILD THE STAGE WHERE STARS ARE DISCOVERED.
        </h2>

        <p className="mt-8 max-w-2xl text-lg text-gray-300">
          The Front Row for Fans.
          <br />
          The Big Stage for Artists.
        </p>

        <div className="mt-10 flex gap-4">
          <button className="rounded-full bg-yellow-500 px-8 py-4 font-bold text-black">
            Become a Founding Member
          </button>

          <button className="rounded-full border border-white px-8 py-4">
            Watch The Vision
          </button>
        </div>

      </section>
    </main>
  );
}