"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Member={user_id:string;username:string;display_name:string;profile_image_path?:string|null};
type Comment={id:number;body:string;created_at:string;author:Member};
type Post={id:number;body:string;created_at:string;author:Member;comments:Comment[]};

function Avatar({member,size="large"}:{member:Member;size?:"large"|"small"}){
  const dimensions=size==="large"?"h-12 w-12 text-lg":"h-8 w-8 text-xs";
  return <div aria-hidden="true" className={`${dimensions} shrink-0 rounded-full border border-[#f4b400]/35 bg-[#17130b] bg-cover bg-center font-black text-[#f4b400] grid place-items-center`} style={member.profile_image_path?{backgroundImage:`url(${member.profile_image_path})`}:{}}>{member.profile_image_path?null:member.display_name.slice(0,1).toUpperCase()}</div>;
}

function MemberName({member}:{member:Member}){return <Link href={`/singers/${member.username}`} className="font-bold text-white transition hover:text-[#f4b400]">{member.display_name} <span className="font-normal text-white/40">@{member.username}</span></Link>}

export default function CommunityFeed({profileId,composerLabel="Share something with the StageFront community..."}:{profileId?:string;composerLabel?:string}){
  const[posts,setPosts]=useState<Post[]>([]);const[message,setMessage]=useState("Loading the community...");const[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{const query=profileId?`?profileId=${encodeURIComponent(profileId)}`:"";const response=await fetch(`/api/community${query}`,{cache:"no-store"});const data=await response.json() as{posts?:Post[];message?:string};setPosts(data.posts||[]);setMessage(data.message||"");},[profileId]);
  // The feed is external server state and must be synchronized when the profile scope changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{void load()},[load]);
  async function post(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const form=event.currentTarget;const body=String(new FormData(form).get("body")||"");const response=await fetch("/api/community",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body,profileUserId:profileId})});const data=await response.json() as{message?:string};setMessage(data.message||"Please try again.");setBusy(false);if(response.ok){form.reset();await load();}}
  async function comment(event:FormEvent<HTMLFormElement>,postId:number){event.preventDefault();const form=event.currentTarget;const body=String(new FormData(form).get("body")||"");const response=await fetch(`/api/community/${postId}/comments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body})});const data=await response.json() as{message?:string};setMessage(data.message||"Please try again.");if(response.ok){form.reset();await load();}}
  return <div className="mt-10 grid gap-6">
    <form onSubmit={post} className="rounded-3xl border border-[#f4b400]/25 bg-white/[.04] p-5 sm:p-6">
      <label className="form-field"><span>{profileId?"Leave a note":"Create a post"}</span><textarea name="body" required maxLength={600} rows={3} placeholder={composerLabel}/></label>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-white/35">Keep it encouraging, music-focused, and respectful.</p><button disabled={busy} className="primary-cta px-6 py-3">{busy?"Sharing...":"Share"}</button></div>
    </form>
    {message?<p aria-live="polite" className="text-sm text-white/50">{message}</p>:null}
    {!message&&!posts.length?<div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-white/45">The stage is quiet. Be the first member to start a conversation.</div>:null}
    {posts.map(post=><article key={post.id} className="rounded-3xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
      <header className="flex items-center gap-3"><Avatar member={post.author}/><div><MemberName member={post.author}/><p className="mt-1 text-xs text-white/35">{new Date(post.created_at).toLocaleString()}</p></div></header>
      <p className="mt-5 whitespace-pre-wrap text-[1.02rem] leading-7 text-white/80">{post.body}</p>
      <div className="mt-6 grid gap-4 border-t border-white/10 pt-5">
        {post.comments.map(item=><div key={item.id} className="flex gap-3"><Avatar member={item.author} size="small"/><div className="min-w-0 flex-1 rounded-2xl bg-white/[.045] px-4 py-3"><MemberName member={item.author}/><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/65">{item.body}</p></div></div>)}
        <form onSubmit={event=>void comment(event,post.id)} className="flex gap-2"><input name="body" required maxLength={300} aria-label="Write a comment" placeholder="Add an encouraging comment..." className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/20 px-4 text-sm text-white outline-none focus:border-[#f4b400]"/><button className="rounded-full border border-[#f4b400]/50 px-4 py-2.5 text-xs font-extrabold text-[#f4b400] transition hover:bg-[#f4b400] hover:text-black">Comment</button></form>
      </div>
    </article>)}
  </div>;
}
