"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Author={username:string;display_name:string;profile_image_url?:string|null};
type Comment={id:number;body:string;created_at:string;author:Author};

export default function ContentComments({contentType,contentId,heading="Join the conversation"}:{contentType:"winner"|"original";contentId:number;heading?:string}){
  const[comments,setComments]=useState<Comment[]>([]);const[message,setMessage]=useState("");const[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{const query=new URLSearchParams({contentType,contentId:String(contentId)});const response=await fetch(`/api/content-comments?${query}`,{cache:"no-store"});const data=await response.json() as{comments?:Comment[];message?:string};setComments(data.comments||[]);setMessage(data.message||"");},[contentId,contentType]);
  // Comments are external server state and reload whenever the selected content changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void load()},[load]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const form=event.currentTarget;const body=String(new FormData(form).get("body")||"");const response=await fetch("/api/content-comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contentType,contentId,body})});const data=await response.json() as{message?:string};setMessage(data.message||"Please try again.");setBusy(false);if(response.ok){form.reset();await load();}}
  return <section className="content-comments" aria-label={heading}>
    <div className="flex items-center justify-between gap-4"><h3>{heading}</h3><span>{comments.length} {comments.length===1?"comment":"comments"}</span></div>
    <div className="mt-5 grid gap-3">{comments.map(comment=><div key={comment.id} className="flex gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#f4b400]/35 bg-[#17130b] bg-cover bg-center text-xs font-black text-[#f4b400]" style={comment.author.profile_image_url?{backgroundImage:`url(${comment.author.profile_image_url})`}:{}}>{comment.author.profile_image_url?null:comment.author.display_name.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1 rounded-2xl bg-white/[.045] px-4 py-3"><Link href={`/singers/${comment.author.username}`} className="text-sm font-bold text-white transition hover:text-[#f4b400]">{comment.author.display_name} <span className="font-normal text-white/35">@{comment.author.username}</span></Link><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/65">{comment.body}</p></div></div>)}</div>
    {!comments.length&&!message?<p className="mt-4 text-sm text-white/40">Be the first member to show some love.</p>:null}
    <form onSubmit={submit} className="mt-5 flex gap-2"><input name="body" required maxLength={300} aria-label={`Comment on ${heading}`} placeholder="Add an encouraging comment..."/><button disabled={busy}>{busy?"Posting...":"Comment"}</button></form>
    {message?<p aria-live="polite" className="mt-3 text-xs text-white/45">{message}</p>:null}
  </section>;
}
