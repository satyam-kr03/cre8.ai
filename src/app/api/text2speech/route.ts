import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('Please define the EXTERNAL_API_BASE_URL environment variable in .env.local');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if we have the prompt
    if (!body.prompt) {
      return NextResponse.json(
        { error: "Missing required parameter: prompt" },
        { status: 400 }
      );
    }
    
    // The external API might expect data in form-data format instead of JSON
    const formData = new FormData();
    formData.append('prompt', body.prompt);
    
    // Try first with FormData
    let response = await fetch(`${API_BASE_URL}/text2speech/`, {
      method: 'POST',
      body: formData,
    });
    
    // If that fails, try with the original JSON approach
    if (response.status === 422 || response.status === 415) {
      console.log("FormData approach failed, trying JSON...");
      
      response = await fetch(`${API_BASE_URL}/text2speech/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: body.prompt }),
      });
    }
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      
      // Try to get more details from the response
      let errorText = "";
      try {
        errorText = await response.text();
        console.error("Error details:", errorText);
      } catch (e) {
        console.error("Could not read error details");
      }
      
      return NextResponse.json(
        { error: `API responded with status: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    // Get the audio as an ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    
    // Return the audio with appropriate headers
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to text2speech service', details: String(error) },
      { status: 500 }
    );
  }
} 