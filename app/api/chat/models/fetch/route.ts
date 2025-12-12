import { NextResponse, NextRequest } from "next/server";


export async function POST(request: NextRequest) {
  const {countOnly = false}: {countOnly: boolean} = await request.json();

  console.log(countOnly);
  if (countOnly) {
    const url = 'https://openrouter.ai/api/v1/models/count';
    const options = {method: 'GET', headers: {Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`}};
    const response = await fetch(url, options);
    const data = await response.json();

    return NextResponse.json({count: data.data.count});
  }else{
    const url = 'https://openrouter.ai/api/v1/models';
    const options = {method: 'GET', headers: {Authorization: 'Bearer <token>'}};

   const response = await fetch(url, options);
   const data = await response.json();
   console.log(data.data);
   return NextResponse.json(data.data);
  }
}