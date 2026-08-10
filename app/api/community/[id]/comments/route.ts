import { authenticatedUser, serviceConfiguration } from "@/lib/stagefront-auth";

const headers=(key:string)=>({apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"});
export async function POST(request:Request,{params}:RouteContext<"/api/community/[id]/comments">){
  const [user,config]=await Promise.all([authenticatedUser(),Promise.resolve(serviceConfiguration())]);
  if(!user)return Response.json({message:"Sign in to join the conversation."},{status:401});
  if(!config)return Response.json({message:"Comments are unavailable."},{status:503});
  const {id}=await params;const postId=Number(id);
  const data=await request.json().catch(()=>null) as {body?:unknown}|null;
  const body=typeof data?.body==="string"?data.body.trim():"";
  if(!Number.isSafeInteger(postId)||postId<1||!body||body.length>300)return Response.json({message:"Write a comment between 1 and 300 characters."},{status:400});
  const profileQuery=new URLSearchParams({select:"user_id",user_id:`eq.${user.id}`,is_public:"eq.true",limit:"1"});
  const profileResponse=await fetch(`${config.url}/rest/v1/stagefront_profiles?${profileQuery}`,{headers:headers(config.serviceKey),cache:"no-store"});
  const [profile]=profileResponse.ok?await profileResponse.json() as {user_id:string}[]:[];
  if(!profile)return Response.json({message:"Create a public StageFront profile before commenting."},{status:403});
  const response=await fetch(`${config.url}/rest/v1/stagefront_comments`,{method:"POST",headers:{...headers(config.serviceKey),Prefer:"return=minimal"},body:JSON.stringify({post_id:postId,author_id:user.id,body})});
  if(!response.ok)return Response.json({message:"Your comment could not be posted."},{status:500});
  return Response.json({message:"Comment posted."},{status:201});
}
