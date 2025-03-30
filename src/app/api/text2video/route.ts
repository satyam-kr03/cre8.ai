import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('Please define the EXTERNAL_API_BASE_URL environment variable in .env.local');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received request body:', JSON.stringify(body, null, 2).substring(0, 300) + '...'); // Log first 300 chars
    
    // Check if we have the prompt
    if (!body || !body.prompt) {
      return NextResponse.json(
        { error: "Missing required parameter: prompt" },
        { status: 400 }
        
      );
    }
    
    // Extract the prompt
    const { prompt } = body;
    console.log(`Processing text2video request with prompt: "${prompt?.substring(0, 30)}..."`);
    
    let response;
    const apiEndpoint = 'text2video';
    
    // Try approach 1: FormData (multipart/form-data)
    try {
      console.log('Attempting text2video with FormData approach');
      const formData = new FormData();
      formData.append('prompt', prompt);
      console.log('Added prompt to FormData');
      
      console.log('Sending multipart/form-data request to:', `${API_BASE_URL}/${apiEndpoint}/`);
      response = await fetch(`${API_BASE_URL}/${apiEndpoint}/`, {
        method: 'POST',
        body: formData
      });
      
      console.log('FormData approach response status:', response.status);
      if (response.ok) {
        console.log('FormData approach successful');
      } else {
        console.log('FormData approach failed, will try URLSearchParams next');
        throw new Error('FormData approach failed');
      }
    } catch (formDataError) {
      console.log('FormData approach error:', formDataError);
      
      // Try approach 2: URLSearchParams (application/x-www-form-urlencoded)
      try {
        console.log('Attempting text2video with URLSearchParams approach');
        const params = new URLSearchParams();
        params.append('prompt', prompt);
        console.log('Added prompt to URLSearchParams');
        
        console.log('Sending urlencoded request to:', `${API_BASE_URL}/${apiEndpoint}/`);
        response = await fetch(`${API_BASE_URL}/${apiEndpoint}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params
        });
        
        console.log('URLSearchParams approach response status:', response.status);
        if (response.ok) {
          console.log('URLSearchParams approach successful');
        } else {
          console.log('URLSearchParams approach failed, will try JSON next');
          throw new Error('URLSearchParams approach failed');
        }
      } catch (urlParamsError) {
        console.log('URLSearchParams approach error:', urlParamsError);
        
        // Try approach 3: JSON body with just the prompt string
        console.log('Attempting text2video with JSON prompt string approach');
        response = await fetch(`${API_BASE_URL}/${apiEndpoint}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(prompt)
        });
        
        console.log('JSON string approach response status:', response.status);
        if (!response.ok) {
          console.log('All approaches failed');
          
          // Try to get error details
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
      }
    }
    
    // If we get here, one of the approaches succeeded
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    // Check content type of the response
    const contentType = response.headers.get('content-type') || '';
    console.log('Response content type:', contentType);
    
    // Process response based on content type
    if (contentType.includes('application/json')) {
      // Handle JSON response
      console.log('Processing JSON response');
      const responseData = await response.json();
      
      // If the JSON contains a URL to a video
      if (responseData.url) {
        console.log('Found video URL in JSON response');
        const videoResponse = await fetch(responseData.url);
        const videoBuffer = await videoResponse.arrayBuffer();
        return new NextResponse(videoBuffer, {
          headers: {
            'Content-Type': 'video/mp4',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }
      
      // If the JSON contains video data
      if (responseData.video || responseData.data) {
        console.log('Found video data in JSON response');
        const base64Video = responseData.video || responseData.data;
        const buffer = Buffer.from(base64Video, 'base64');
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'video/mp4',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }
      
      // Return the JSON response as is
      return NextResponse.json(responseData);
    } else if (contentType.includes('video/')) {
      // Handle binary video response
      console.log('Processing binary video response');
      const videoBuffer = await response.arrayBuffer();
      return new NextResponse(videoBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } else {
      // Handle other content types
      console.log('Received non-JSON, non-video response');
      const text = await response.text();
      console.log('Response content (first 100 chars):', text.substring(0, 100));
      
      // Try to parse as JSON first in case content-type is wrong
      try {
        const jsonData = JSON.parse(text);
        return NextResponse.json(jsonData);
      } catch (e) {
        // If not JSON, check if it's a video URL
        if (text.trim().startsWith('http') && (text.includes('video') || text.includes('mp4'))) {
          console.log('Detected a video URL in text response');
          const videoResponse = await fetch(text.trim());
          const videoBuffer = await videoResponse.arrayBuffer();
          return new NextResponse(videoBuffer, {
            headers: {
              'Content-Type': 'video/mp4',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        }
        
        // Return the text content
        return NextResponse.json({
          result: text
        });
      }
    }
  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to process video generation request: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "OK",
    documentation: "POST to this endpoint with a JSON body containing a 'prompt' field to generate a video"
  });
} 