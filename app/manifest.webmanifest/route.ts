export function GET() {
  return Response.json(
    {
      name: "Zoo Crew Vibe | StageFront",
      short_name: "Zoo Crew",
      description: "The official Zoo Crew Vibe community and Live House.",
      id: "/live",
      start_url: "/live",
      scope: "/",
      display: "standalone",
      orientation: "any",
      background_color: "#050705",
      theme_color: "#050705",
      categories: ["entertainment", "music", "social"],
      icons: [
        {
          src: "/images/zoo-crew/zoo-crew-vibe-house-gate.png",
          sizes: "1254x1254",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/images/favicons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      shortcuts: [
        {
          name: "Enter Live House",
          short_name: "Live House",
          url: "/live",
          icons: [{ src: "/images/favicons/icon-192x192.png", sizes: "192x192" }],
        },
        {
          name: "Zoo Crew Community",
          short_name: "Community",
          url: "/community",
          icons: [{ src: "/images/favicons/icon-192x192.png", sizes: "192x192" }],
        },
      ],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
