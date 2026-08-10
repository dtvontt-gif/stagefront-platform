import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";
import { profileImageUrl } from "@/lib/profile-images";

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
type Profile = { user_id:string; username:string; display_name:string; profile_image_path:string|null };
type Post = { id:number; author_id:string; profile_user_id:string|null; body:string; created_at:string };
type Comment = { id:number; post_id:number; author_id:string; body:string; created_at:string };

async function profilesFor(url:string,key:string,ids:string[]){
  if(!ids.length)return new Map<string,Profile>();
  const query=new URLSearchParams({select:"user_id,username,display_name,profile_image_path",user_id:`in.(${[...new Set(ids)].join(",")})`,is_public:"eq.true"});
  const response=await fetch(`${url}/rest/v1/stagefront_profiles?${query}`,{headers:headers(key),cache:"no-store"});
  const profiles=response.ok?await response.json() as Profile[]:[];
  return new Map(profiles.map(profile=>[profile.user_id,{...profile,profile_image_path:profileImageUrl(url,profile.profile_image_path)}]));
}

export async function GET(request:Request){
  const config=serviceConfiguration();
  if(!config)return Response.json({message:"Community feed is unavailable."},{status:503});
  const profileId=new URL(request.url).searchParams.get("profileId");
  const query=new URLSearchParams({select:"id,author_id,profile_user_id,body,created_at",status:"eq.visible",order:"created_at.desc",limit:"40"});
  if(profileId)query.set("profile_user_id",`eq.${profileId}`);
  const postResponse=await fetch(`${config.url}/rest/v1/stagefront_posts?${query}`,{headers:headers(config.serviceKey),cache:"no-store"});
  if(!postResponse.ok)return Response.json({message:"Community posts are not ready yet.",posts:[]});
  const posts=await postResponse.json() as Post[];
  const ids=posts.map(post=>post.id);
  let comments:Comment[]=[];
  if(ids.length){
    const commentQuery=new URLSearchParams({select:"id,post_id,author_id,body,created_at",post_id:`in.(${ids.join(",")})`,status:"eq.visible",order:"created_at.asc",limit:"400"});
    const response=await fetch(`${config.url}/rest/v1/stagefront_comments?${commentQuery}`,{headers:headers(config.serviceKey),cache:"no-store"});
    if(response.ok)comments=await response.json() as Comment[];
  }
  const profileMap=await profilesFor(config.url,config.serviceKey,[...posts.map(post=>post.author_id),...comments.map(comment=>comment.author_id)]);
  const visiblePosts=posts.filter(post=>profileMap.has(post.author_id)).map(post=>({
    ...post,author:profileMap.get(post.author_id),comments:comments.filter(comment=>comment.post_id===post.id&&profileMap.has(comment.author_id)).map(comment=>({...comment,author:profileMap.get(comment.author_id)})),
  }));
  return Response.json({posts:visiblePosts});
}

export async function POST(request:Request){
  const [user,config]=await Promise.all([authenticatedUser(),Promise.resolve(serviceConfiguration())]);
  if(!user)return Response.json({message:"Sign in to share with the community."},{status:401});
  if(!config)return Response.json({message:"Community feed is unavailable."},{status:503});
  const data=await request.json().catch(()=>null) as {body?:unknown;profileUserId?:unknown}|null;
  const body=typeof data?.body==="string"?data.body.trim():"";
  const profileUserId=typeof data?.profileUserId==="string"?data.profileUserId:null;
  if(!body||body.length>600)return Response.json({message:"Write between 1 and 600 characters."},{status:400});
  const profileQuery=new URLSearchParams({select:"user_id",user_id:`eq.${user.id}`,is_public:"eq.true",limit:"1"});
  const profileResponse=await fetch(`${config.url}/rest/v1/stagefront_profiles?${profileQuery}`,{headers:headers(config.serviceKey),cache:"no-store"});
  const [profile]=profileResponse.ok?await profileResponse.json() as {user_id:string}[]:[];
  if(!profile)return Response.json({message:"Create a public StageFront profile before posting."},{status:403});
  if(profileUserId){
    const targetQuery=new URLSearchParams({select:"user_id",user_id:`eq.${profileUserId}`,is_public:"eq.true",limit:"1"});
    const targetResponse=await fetch(`${config.url}/rest/v1/stagefront_profiles?${targetQuery}`,{headers:headers(config.serviceKey),cache:"no-store"});
    const [target]=targetResponse.ok?await targetResponse.json() as {user_id:string}[]:[];
    if(!target)return Response.json({message:"That member profile is not available."},{status:404});
  }
  const response=await fetch(`${config.url}/rest/v1/stagefront_posts`,{method:"POST",headers:{...headers(config.serviceKey),Prefer:"return=minimal"},body:JSON.stringify({author_id:user.id,profile_user_id:profileUserId,body})});
  if(!response.ok)return Response.json({message:"Your post could not be shared."},{status:500});
  return Response.json({message:"Shared with StageFront."},{status:201});
}
