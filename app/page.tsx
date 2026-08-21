import Link from "next/link";
import { KARAOKE_PROJECT_SCHEMA } from "@/lib/karaoke-v2/project-schema";

export default function Home() {
  return (
    <main>
      <p className="eyebrow">StageFront</p>
      <h1>Karaoke Engine v2</h1>
      <p className="lede">Clean foundation for the next karaoke engine. Processing features are not connected yet.</p>
      <dl>
        <div><dt>Engine</dt><dd>Foundation</dd></div>
        <div><dt>Project schema</dt><dd>{KARAOKE_PROJECT_SCHEMA}</dd></div>
        <div><dt>API namespace</dt><dd>/api/karaoke-v2</dd></div>
      </dl>
      <Link className="button-link" href="/studio">Open the studio</Link>
    </main>
  );
}
