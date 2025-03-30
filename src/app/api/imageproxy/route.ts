import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('Please define the EXTERNAL_API_BASE_URL environment variable in .env.local');
}

// Default image sizes
const DEFAULT_SIZES = {
  SQUARE: { width: 640, height: 640 },
  LANDSCAPE: { width: 1280, height: 640 }
};

// Default generation steps
const DEFAULT_STEPS = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received request body:', JSON.stringify(body, null, 2).substring(0, 300) + '...'); // Log first 300 chars
    
    const { 
      endpoint, 
      prompt, 
      init_image, 
      size = 'LANDSCAPE', 
      steps = DEFAULT_STEPS, 
      strength // Add strength for Ghibli
    } = body;
    
    console.log(`Processing ${endpoint} request with prompt: "${prompt?.substring(0, 30)}..."`);
    
    // Determine which API endpoint to use
    let apiEndpoint = endpoint; // Use the endpoint directly
    if (!['img2img', 'text2img', 'img2ghibli'].includes(apiEndpoint)) {
      apiEndpoint = init_image ? 'img2img' : 'text2img'; // Fallback logic
      console.warn(`Invalid endpoint specified, defaulting to ${apiEndpoint}`);
    }
    
    // Set width and height based on selected size
    const { width, height } = size === 'SQUARE' 
      ? DEFAULT_SIZES.SQUARE 
      : DEFAULT_SIZES.LANDSCAPE;
    
    console.log(`Using dimensions: ${width}x${height}, steps: ${steps}`);
    
    let response;
    
    if (apiEndpoint === 'img2img') {
      console.log('Using img2img endpoint with image');
      // For img2img endpoint, use multipart/form-data
      const formData = new FormData();
      
      // Add the prompt - the only text parameter needed
      formData.append('prompt', prompt);
      console.log('Added prompt to FormData');
      
      // Add dimension and steps parameters
      formData.append('width', width.toString());
      formData.append('height', height.toString());
      formData.append('steps', steps.toString());
      console.log(`Added dimensions (${width}x${height}) and steps (${steps}) to FormData`);
      
      // Convert base64 to blob for the image
      const imageBlob = await fetch(`data:image/png;base64,${init_image}`).then(r => r.blob());
      formData.append('file', imageBlob);
      console.log('Added image blob to FormData');
      
      console.log('Sending multipart/form-data request to:', `${API_BASE_URL}/${apiEndpoint}/`);
      
      response = await fetch(`${API_BASE_URL}/${apiEndpoint}/`, {
        method: 'POST',
        body: formData
      });
    } else if (apiEndpoint === 'img2ghibli') {
      console.log('Using img2ghibli endpoint');
      if (!init_image) {
        return NextResponse.json({ error: 'Missing required image for img2ghibli' }, { status: 400 });
      }
      
      const formData = new FormData();
      
      if (prompt) formData.append('prompt', prompt);
      formData.append('strength', strength ? strength.toString() : '0.8'); // Default strength if not provided
      formData.append('width', width.toString());
      formData.append('height', height.toString());
      // Add other img2ghibli specific params if needed (e.g., style_ratio, cfg_scale, control_strength, sampling_method)
      if (steps) formData.append('steps', steps.toString()); // Assuming steps is used

      const imageBlob = await fetch(`data:image/png;base64,${init_image}`).then(r => r.blob());
      formData.append('file', imageBlob);
      console.log('Added Ghibli params and image blob to FormData');

      console.log('Sending multipart/form-data request to:', `${API_BASE_URL}/${apiEndpoint}/`);
      response = await fetch(`${API_BASE_URL}/${apiEndpoint}/`, {
        method: 'POST',
        body: formData
      });
    } else {
      console.log('Using text2img endpoint');
      // For text2img endpoint, use application/x-www-form-urlencoded
      const params = new URLSearchParams();
      
      // Add prompt parameter
      params.append('prompt', prompt);
      console.log('Added prompt to URLSearchParams');
      
      // Add dimension and steps parameters
      params.append('width', width.toString());
      params.append('height', height.toString());
      params.append('steps', steps.toString());
      console.log(`Added dimensions (${width}x${height}) and steps (${steps}) to URLSearchParams`);
      
      console.log('Sending urlencoded request to:', `${API_BASE_URL}/${apiEndpoint}/ with params: ${params.toString()}`);
      
      response = await fetch(`${API_BASE_URL}/${apiEndpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });
    }
    
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
      // Handle JSON response
      console.log('Processing JSON response');
      const responseData = await response.json();
      return NextResponse.json(responseData);
    } else if (contentType.includes('image/')) {
      console.log('Processing binary image response');
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString('base64');
      
      return NextResponse.json({ 
        image: base64Image,
        contentType: contentType
      });
    } else {
      // Handle other content types
      console.log('Received non-JSON, non-image response');
      const text = await response.text();
      console.log('Response content (first 100 chars):', text.substring(0, 100));
      
      // Try to parse as JSON first in case content-type is wrong
      try {
        const jsonData = JSON.parse(text);
        return NextResponse.json(jsonData);
      } catch (e) {
        // Return the text content with error
        return NextResponse.json({
          error: 'Unexpected response type from API',
          content: text.substring(0, 500)
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to process image generation request: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 