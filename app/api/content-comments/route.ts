import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";
import { profileImageUrl } from "@/lib/profile-images";

const headers=(key:string)=>({apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"});
const contentTypes=new Set(["winner","original"]);
type Comment={id:number;author_id:string;body:string;created_at:string};
type Profile={user_id:string;username:string;display_name:string;profile_image_path:string|null};

function target(data:{contentType?:unknown;contentId?:unknown}|null){
  const contentType=typeof data?.contentType==="string"?data.contentType:"";
  const contentId=Number(data?.contentId);
  return contentTypes.has(contentType)&&Number.isSafeInteger(contentId)&&contentId>0?{contentType,contentId}:null;
}

export async function GET(request:Request){
  const config=serviceConfiguration();if(!config)return Response.json({message:"Comments are unavailable."},{status:503});
  const url=new URL(request.url);const selected=target({contentType:url.searchParams.get("contentType"),contentId:url.searchParams.get("contentId")});
  if(!selected)return Response.json({message:"That discussion could not be found."},{status:400});
  const query=new URLSearchParams({select:"id,author_id,body,created_at",content_type:`eq.${selected.contentType}`,content_id:`eq.${selected.contentId}`,status:"eq.visible",order:"created_at.asc",limit:"200"});
  const response=await fetch(`${config.url}/rest/v1/stagefront_content_comments?${query}`,{headers:headers(config.serviceKey),cache:"no-store"});
  if(!response.ok)return Response.json({comments:[],message:"Comments are not ready yet."});
  const comments=await response.json() as Comment[];if(!comments.length)return Response.json({comments:[]});
  const profileQuery=new URLSearchParams({select:"user_id,username,display_name,profile_image_path",user_id:`in.(${[...new Set(comments.map(comment=>comment.author_id))].join(",")})`,is_public:"eq.true"});
  const profileResponse=await fetch(`${config.url}/rest/v1/stagefront_profiles?${profileQuery}`,{headers:headers(config.serviceKey),cache:"no-store"});
  const profiles=profileResponse.ok?await profileResponse.json() as Profile[]:[];
  const profileMap=new Map(profiles.map(profile=>[profile.user_id,{...profile,profile_image_url:profileImageUrl(config.url,profile.profile_image_path)}]));
  return Response.json({comments:comments.filter(comment=>profileMap.has(comment.author_id)).map(comment=>({...comment,author:profileMap.get(comment.author_id)}))});
}

export async function POST(request:Request){
  const [user,config]=await Promise.all([authenticatedUser(),Promise.resolve(serviceConfiguration())]);
  if(!user)return Response.json({message:"Sign in to join the conversation."},{status:401});
  if(!config)return Response.json({message:"Comments are unavailable."},{status:503});
  const data=await request.json().catch(()=>null) as{contentType?:unknown;contentId?:unknown;body?:unknown}|null;const selected=target(data);
  const body=typeof data?.body==="string"?data.body.trim():"";
  if(!selected||!body||body.length>300)return Response.json({message:"Write a comment between 1 and 300 characters."},{status:400});
  const profileQuery=new URLSearchParams({select:"user_id",user_id:`eq.${user.id}`,is_public:"eq.true",limit:"1"});
  const profileResponse=await fetch(`${config.url}/rest/v1/stagefront_profiles?${profileQuery}`,{headers:headers(config.serviceKey),cache:"no-store"});
  const [profile]=profileResponse.ok?await profileResponse.json() as{user_id:string}[]:[];
  if(!profile)return Response.json({message:"Create a public StageFront profile before commenting."},{status:403});
  const response=await fetch(`${config.url}/rest/v1/stagefront_content_comments`,{method:"POST",headers:{...headers(config.serviceKey),Prefer:"return=minimal"},body:JSON.stringify({content_type:selected.contentType,content_id:selected.contentId,author_id:user.id,body})});
  if(!response.ok)return Response.json({message:"Your comment could not be posted."},{status:500});
  return Response.json({message:"Comment posted."},{status:201});
}
