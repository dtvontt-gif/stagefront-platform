export function GET() {
  return Response.json(
    {
      name: "StageFront Live Scout",
      short_name: "SF Scout",
      description: "Private StageFront host live-status control.",
      id: "/scout",
      start_url: "/scout",
      scope: "/",
      display: "standalone",
      background_color: "#070708",
      theme_color: "#070708",
      icons: [
        {
          src: "/images/favicons/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/images/favicons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
