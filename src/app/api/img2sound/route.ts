import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('Please define the EXTERNAL_API_BASE_URL environment variable in .env.local');
}

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    
    // Check if we have the file - use a more reliable approach for server-side
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: "Missing required parameter: file" },
        { status: 400 }
      );
    }
    
    // Create a new FormData object to send to external API
    const externalFormData = new FormData();
    externalFormData.append('file', file);
    
    // Add optional parameters if they exist
    const prompt = formData.get('prompt');
    if (prompt && typeof prompt === 'string') {
      externalFormData.append('prompt', prompt);
    }
    
    const duration = formData.get('duration');
    if (duration) {
      externalFormData.append('duration', duration.toString());
    }
    
    // Send the request to the external API
    const response = await fetch(`${API_BASE_URL}/img2sound/`, {
      method: 'POST',
      body: externalFormData,
    });
    
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
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to img2sound service', details: String(error) },
      { status: 500 }
    );
  }
} 