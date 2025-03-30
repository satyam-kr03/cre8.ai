import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('Please define the EXTERNAL_API_BASE_URL environment variable in .env.local');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
        prompt, 
        negative_prompt = null, 
        num_frames = 30, 
        guidance_scale = 7, 
        num_inference_steps = 25 
    } = body;
    
    console.log(`Processing /text2animation request with prompt: "${prompt.substring(0, 30)}..."`);
    
    // For text2animation endpoint, use application/x-www-form-urlencoded
    const params = new URLSearchParams();
    
    // Add required prompt
    params.append('prompt', prompt);
    
    // Add optional parameters if they have values
    if (negative_prompt) {
      params.append('negative_prompt', negative_prompt);
    }
    if (num_frames) {
      params.append('num_frames', num_frames.toString());
    }
    if (guidance_scale) {
      params.append('guidance_scale', guidance_scale.toString());
    }
    if (num_inference_steps) {
      params.append('num_inference_steps', num_inference_steps.toString());
    }
    
    console.log('Sending urlencoded request to:', `${API_BASE_URL}/text2animation/ with params: ${params.toString()}`);
    
    const response = await fetch(`${API_BASE_URL}/text2animation/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    if (!response.ok) {
      console.error('API error:', response.status);
      try {
        const errorText = await response.text();
        console.error('Error response body:', errorText.substring(0, 200));
        return NextResponse.json(
          { error: `API error: ${response.status} - ${errorText.substring(0, 100)}` },
          { status: response.status }
        );
      } catch (e) {
        return NextResponse.json(
          { error: `API error: ${response.status}` },
          { status: response.status }
        );
      }
    }
    
    // Check content type of the response
    const contentType = response.headers.get('content-type') || '';
    console.log('Response content type:', contentType);
    
    // Process response based on content type
    if (contentType.includes('application/json')) {
      console.log('Processing JSON response');
      const responseData = await response.json();
      return NextResponse.json(responseData); // Assuming it contains animation data in a specific key
    } else if (contentType.includes('image/gif')) { // Specifically handle GIF
      console.log('Processing binary GIF response');
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Animation = buffer.toString('base64');
      
      return NextResponse.json({ 
        animation: base64Animation, // Return base64 data under 'animation' key
        contentType: contentType
      });
    } else if (contentType.includes('video/') || contentType.includes('image/') || contentType.includes('application/octet-stream')) {
      // Handle other potential binary types (e.g., video, other images)
      console.log('Processing other binary response type:', contentType);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      
      // Try returning with a generic key if it's not GIF
      return NextResponse.json({ 
        data: base64Data, // Use a generic key like 'data'
        contentType: contentType
      });
    } else {
      // Handle non-binary, non-JSON types
      console.log('Received non-JSON, non-binary response');
      const text = await response.text();
      console.log('Response content (first 100 chars):', text.substring(0, 100));
      
      try {
        const jsonData = JSON.parse(text);
        return NextResponse.json(jsonData);
      } catch (e) {
        return NextResponse.json({
          error: 'Unexpected response type from API',
          content: text.substring(0, 500)
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Animation proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to process animation generation request: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 