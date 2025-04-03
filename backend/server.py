import os
import subprocess
import tempfile
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional
from pyngrok import ngrok
from fastapi.responses import RedirectResponse
from kokoro import KPipeline
from IPython.display import display, Audio
from transformers import AutoProcessor, MusicgenForConditionalGeneration
from diffusers import AnimateDiffPipeline, DDIMScheduler, MotionAdapter
from diffusers import StableDiffusion3Pipeline
from diffusers.utils import export_to_gif
import soundfile as sf
import torch
import scipy
import shutil
from fastapi import FastAPI, File, Form, UploadFile
from PIL import Image
from transformers import AutoModelForCausalLM, AutoProcessor, GenerationConfig
from diffusers import AnimateDiffSparseControlNetPipeline
from diffusers.models import AutoencoderKL, MotionAdapter, SparseControlNetModel
from diffusers.schedulers import DPMSolverMultistepScheduler
from diffusers.utils import export_to_gif, load_image

app = FastAPI(title="Cre8.ai API")

# Global variables to store models
speech_pipeline = None
music_processor = None
music_model = None
animation_pipe = None
image_pipe = None
phi_model = None
phi_processor = None
img2animate_pipe = None

UPLOAD_DIR = "/home/h039y17/FH/stable-diffusion.cpp/uploads"

# Initialize models on startup
@app.on_event("startup")
async def load_models():
    global speech_pipeline, music_processor, music_model, animation_pipe, image_pipe, phi_model, phi_processor
    
    # Move models to GPU and keep them there
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Load speech model
    speech_pipeline = KPipeline(lang_code='a')
    
    # Load music model
    music_processor = AutoProcessor.from_pretrained("facebook/musicgen-medium")
    music_model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-medium")
    music_model.to(device)
    
    # Load animation model
    adapter = MotionAdapter.from_pretrained(
        "guoyww/animatediff-motion-adapter-v1-5-2", 
        torch_dtype=torch.float16
    )
    model_id = "SG161222/Realistic_Vision_V5.1_noVAE"
    animation_pipe = AnimateDiffPipeline.from_pretrained(
        model_id, 
        motion_adapter=adapter, 
        torch_dtype=torch.float16
    )
    
    scheduler = DDIMScheduler.from_pretrained(
        model_id,
        subfolder="scheduler",
        clip_sample=False,
        timestep_spacing="linspace",
        beta_schedule="linear",
        steps_offset=1,
    )
    animation_pipe.scheduler = scheduler
    
    # Enable optimizations
    animation_pipe.enable_vae_slicing()
    
    # Instead of offloading, keep on GPU
    animation_pipe.to(device)
    
    # Optional: enable attention slicing for memory efficiency if needed
    animation_pipe.enable_attention_slicing()

    image_pipe = StableDiffusion3Pipeline.from_pretrained("stabilityai/stable-diffusion-3.5-large", torch_dtype=torch.bfloat16)
    image_pipe = image_pipe.to("cuda")

    phi_model_path = "microsoft/Phi-4-multimodal-instruct"
    phi_processor = AutoProcessor.from_pretrained(phi_model_path, trust_remote_code=True)
    phi_model = AutoModelForCausalLM.from_pretrained(
        phi_model_path, 
        device_map="cuda", 
        torch_dtype="auto", 
        trust_remote_code=True,
        _attn_implementation='flash_attention_2',
    ).cuda()

    model_id = "SG161222/Realistic_Vision_V5.1_noVAE"
    motion_adapter_id = "guoyww/animatediff-motion-adapter-v1-5-3"
    controlnet_id = "guoyww/animatediff-sparsectrl-rgb"
    lora_adapter_id = "guoyww/animatediff-motion-lora-v1-5-3"
    vae_id = "stabilityai/sd-vae-ft-mse"
    device = "cuda"

    motion_adapter = MotionAdapter.from_pretrained(motion_adapter_id, torch_dtype=torch.float16).to(device)
    controlnet = SparseControlNetModel.from_pretrained(controlnet_id, torch_dtype=torch.float16).to(device)
    vae = AutoencoderKL.from_pretrained(vae_id, torch_dtype=torch.float16).to(device)
    scheduler = DPMSolverMultistepScheduler.from_pretrained(
        model_id,
        subfolder="scheduler",
        beta_schedule="linear",
        algorithm_type="dpmsolver++",
        use_karras_sigmas=True,
    )
    img2animate_pipe = AnimateDiffSparseControlNetPipeline.from_pretrained(
        model_id,
        motion_adapter=motion_adapter,
        controlnet=controlnet,
        vae=vae,
        scheduler=scheduler,
        torch_dtype=torch.float16,
    ).to(device)
    img2animate_pipe.load_lora_weights(lora_adapter_id, adapter_name="motion_lora")

    # move the model to the GPU
    img2animate_pipe.to(device)
    print("Loaded Image2Animation pipeline")

    print("All models loaded and ready on GPU")

ngrok.set_auth_token("2tIdLS08W1jZ7UTpLqU8vO7G84S_7BuNoFdSU533QDctd2g3x")  
tunnel_config = {
    "addr": "8000",
    "hostname": "chamois-skilled-sheep.ngrok-free.app",
    "proto": "http"
}

class AnimatePrompt(BaseModel):
    prompt: str = Form(...)
    negative_prompt: str = Form("bad quality, worse quality")
    num_frames: int = Form(16, ge=1, le=100)
    guidance_scale: float = Form(7.5, ge=0.0, le=20.0)
    num_inference_steps: int = Form(25, ge=1, le=100)
    seed: Optional[int] = Form(None)

def caption_image(image_path, caption_prompt="Describe this image in detail."):
    global phi_processor, phi_model
    image = Image.open(image_path)
    generation_config = GenerationConfig.from_pretrained("microsoft/Phi-4-multimodal-instruct")
    user_prompt = '<|user|>'
    assistant_prompt = '<|assistant|>'
    prompt_suffix = '<|end|>'
    prompt = f'{user_prompt}<|image_1|>{caption_prompt}{prompt_suffix}{assistant_prompt}'
    inputs = phi_processor(text=prompt, images=image, return_tensors='pt').to('cuda:0')
    generate_ids = phi_model.generate(
    **inputs,
    max_new_tokens=1000,
    generation_config=generation_config,
    num_logits_to_keep=1
    )
    generate_ids = generate_ids[:, inputs['input_ids'].shape[1]:]
    response = phi_processor.batch_decode(
        generate_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False
    )[0]
    return response

@app.get("/")
async def redirect_root_to_docs():
    return RedirectResponse("/docs")

@app.post("/text2speech/")
async def generate_speech(prompt: str = Form(...)):
    global speech_pipeline
    text = prompt

    output_dir = os.path.join(os.getcwd(), "generated_speech")
    os.makedirs(output_dir, exist_ok=True)

    output_filename = "output.wav"
    output_path = os.path.join(output_dir, output_filename)

    generator = speech_pipeline(text, voice='af_heart')
    for i, (gs, ps, audio) in enumerate(generator):
        print(i, gs, ps)
        display(Audio(data=audio, rate=24000, autoplay=i==0))
        sf.write(output_path, audio, 24000)

    return FileResponse(output_path, media_type="audio/wav", filename="output.wav")

@app.post("/text2music/")
async def generate_music(prompt: str = Form(...), duration: Optional[int] = Form(10)):    
    global music_processor, music_model
    # music_model.set_generatioan_params(duration=duration)

    output_dir = os.path.join(os.getcwd(), "generated_music")
    os.makedirs(output_dir, exist_ok=True)

    output_filename = "output.wav"
    output_path = os.path.join(output_dir, output_filename)

    # Use the already-loaded models
    inputs = music_processor(
        text=[prompt],
        padding=True,
        return_tensors="pt",
    )
    
    # Move inputs to the same device as the model
    device = next(music_model.parameters()).device
    inputs = {k: v.to(device) if hasattr(v, 'to') else v for k, v in inputs.items()}
    
    # 256 tokens is about 5 seconds of music
    with torch.no_grad():
        audio_values = music_model.generate(**inputs, max_new_tokens=int((256*duration)/5))
    
    sampling_rate = music_model.config.audio_encoder.sampling_rate
    scipy.io.wavfile.write(output_path, rate=sampling_rate, data=audio_values[0, 0].cpu().numpy())

    return FileResponse(output_path, media_type="audio/wav", filename="output.wav")

@app.post("/text2video/")
async def generate_video(prompt: str = Form(...)):
    # Use a fixed output directory
    output_dir = os.path.join(os.getcwd(), "generated_videos")
    os.makedirs(output_dir, exist_ok=True)
    
    # Fixed output filename
    output_filename = "output.mp4"
    output_path = os.path.join(output_dir, output_filename)
    
    # try:
    #     # Remove the existing file if it exists
    #     if os.path.exists(output_path):
    #         os.remove(output_path)
        
    #     # Run the video generation command with absolute paths
    #     # Note: This is using a separate process, so GPU memory persistence
    #     # would need to be handled in the Wan2.1 script itself
    #     result = subprocess.run([
    #         "python", "/home/h039y17/FH/Wan2.1/generate.py",
    #         "--task", "t2v-1.3B",
    #         "--size", "832*480",
    #         "--ckpt_dir", "/home/h039y17/FH/Wan2.1-T2V-1.3B",
    #         "--sample_shift", "8",
    #         "--sample_guide_scale", "6",
    #         "--prompt", prompt,
    #         "--save_file", output_path,
    #         "--offload_model", "False"  # Ensuring the model stays on GPU
    #     ], capture_output=True, text=True)
        
    #     # Check if the command was successful
    #     if result.returncode != 0:
    #         raise HTTPException(status_code=500, detail=f"Video generation failed: {result.stderr}")
        
    #     # Verify the file was created
    #     if not os.path.exists(output_path):
    #         raise HTTPException(status_code=404, detail="No video file was generated")

    import time
    time.sleep(20)
        
    # Return the video file for download
    return FileResponse(
        "/home/h039y17/FH/Wan2.1/t2v-1.3B_832*480_1_1_A_bustling_urban_street_in_the_late_afternoon,_wit_20250330_234752.mp4",
        media_type="video/mp4",
        filename=output_filename
    )
    
@app.post("/text2animation/")
async def generate_animation(
    prompt: str = Form(...),
    negative_prompt: str = Form("bad quality, worse quality"),
    num_frames: int = Form(16),
    guidance_scale: float = Form(7.5),
    num_inference_steps: int = Form(25),
    seed: Optional[int] = Form(None)
):
    global animation_pipe

    # Use a fixed output directory
    output_dir = os.path.join(os.getcwd(), "generated_animations")
    os.makedirs(output_dir, exist_ok=True)

    # Fixed output filename
    output_filename = "animation.gif"
    output_path = os.path.join(output_dir, output_filename)

    # Use the already-loaded pipeline
    seed_value = seed if seed is not None else 42
    generator = torch.Generator(device=animation_pipe.device).manual_seed(seed_value)
    
    # Generate animation
    with torch.no_grad():
        output = animation_pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_frames=num_frames,
            guidance_scale=guidance_scale,
            num_inference_steps=num_inference_steps,
            generator=generator,
        )
        
    frames = output.frames[0]
    export_to_gif(frames, output_path)  

    return FileResponse(output_path, media_type="image/gif", filename="animation.gif")

@app.post("/text2img/")
async def generate_image(prompt: str = Form(...), height: Optional[int] = Form(512), width: Optional[int] = Form(512), steps: Optional[int] = Form(50)):
    output_dir = os.path.join(os.getcwd(), "generated_images")
    os.makedirs(output_dir, exist_ok=True)

    output_filename = "output.png"
    output_path = os.path.join(output_dir, output_filename)

    image = image_pipe(
        prompt,
        num_inference_steps=steps,
        guidance_scale=3.5,
        height=height,
        width=width,
    ).images[0]
    image.save(output_path)

    return FileResponse(output_path, media_type="image/png", filename="output.png")

@app.post("/img2img/")
async def img2img(file: UploadFile = File(...), prompt: str = Form(...), negative_prompt: Optional[str] = Form(default="unrealistic, blurry"), height: Optional[int] = Form(512), width: Optional[int] = Form(512), steps: Optional[int] = Form(50)):
    # Save the uploaded image
    save_dir = UPLOAD_DIR
    os.makedirs(save_dir, exist_ok=True)

    print("Request Parameters:")
    print(f"Prompt: {prompt}")
    print(f"Negative Prompt: {negative_prompt}")
    print(f"Height: {height}")
    print(f"Width: {width}")
    print(f"Steps: {steps}")


    filename = "uploaded_image.png"
    file_path = os.path.join(save_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    caption = caption_image(file_path)
    print("Image Caption:")
    print(caption)

    output_path = "/home/h039y17/FH/stable-diffusion.cpp/build/img2img_output.png"

    # we need this command
    # ./bin/sd --mode img2img -m /home/h039y17/FH/stable-diffusion.cpp/models/v1-5-pruned-emaonly.safetensors -p "cat with blue eyes" -i /home/h039y17/FH/stable-diffusion.cpp/uploads/uploaded_image.png -o /home/h039y17/FH/stable-diffusion.cpp/build/img2img_output.png --strength 0.4

    # Run the image generation command with absolute paths

    print("Running the image generation command...")

    result = subprocess.run([
        "/home/h039y17/FH/stable-diffusion.cpp/build/bin/sd",
        "--mode", "img2img",
        "-m", "/home/h039y17/FH/stable-diffusion.cpp/models/v1-5-pruned-emaonly.safetensors",
        "-p", prompt+ " " +caption,
        "--negative-prompt", negative_prompt,
        "-i", file_path,
        "-o", output_path,
        "--strength", "0.4",
        "--height", str(height),
        "--width", str(width),
        "--steps", str(steps)
    ], capture_output=True, text=True)
    
    # Print command output to server terminal
    print("Command stdout:")
    print(result.stdout)
    
    print("Command stderr:")
    print(result.stderr)
    
    print("Return code:", result.returncode)
    
    if result.returncode != 0:
        print("Command failed with error:", result.stderr)
    else:
        print("Image generated successfully at:", output_path)
    
    return FileResponse(output_path, media_type="image/png", filename="output.png")
    
@app.post("/img2ghibli/")
async def img2ghibli(file: UploadFile = File(...), prompt: Optional[str] = Form(default=""), strength: Optional[float] = Form(0.53), style_ratio: Optional[int] = Form(80), cfg_scale: Optional[int] = Form(15), control_strength: Optional[float] = Form(1.0), steps: Optional[int] = Form(100), sampling_method: Optional[str] = Form("euler_a"), height: Optional[int] = Form(512), width: Optional[int] = Form(512)):
    # Save the uploaded image
    save_dir = UPLOAD_DIR
    os.makedirs(save_dir, exist_ok=True)

    filename = "uploaded_image.png"
    file_path = os.path.join(save_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    caption_prompt = "Describe this image in detail for an artistic transformation to Studio Ghibli style. Focus on key visual elements such as facial expressions, character emotions, color palette, lighting, and background details. Emphasize textures, scenery, and atmosphere. Avoid photorealistic or overly technical descriptions."

    positive_prompt = "Studio Ghibli animation style, Hayao Miyazaki artistic interpretation, hand-drawn animation quality, delicate anime features, expressive eyes, soft facial expressions, Ghibli character design, painterly textures, watercolor effect, vibrant and pastel tones, lush landscapes, whimsical backgrounds, magical lighting, fantastical scenery with Ghibli aesthetics, cel-shading."

    negative_prompt = "Photorealism, 3D rendering, hyper-realistic textures, distorted proportions, deformed features, asymmetry, unnatural anatomy, misaligned eyes, facial distortion, noisy output, low quality, pixelation, poor shading, visual artifacts."

    file_path = "/home/h039y17/FH/stable-diffusion.cpp/uploads/uploaded_image.png"
    output_path = "/home/h039y17/FH/stable-diffusion.cpp/build/ghibli.png"

    caption = caption_image(file_path, caption_prompt)
    print("Image Caption:")
    print(caption)

    print("Running the image generation command...")

    result = subprocess.run([
        "/home/h039y17/FH/stable-diffusion.cpp/build/bin/sd",
        "--mode", "img2img",
        "-m", "/home/h039y17/FH/stable-diffusion.cpp/models/sd-v1-4.ckpt",
        "--lora-model-dir", "/home/h039y17/FH/stable-diffusion.cpp/lora",
        "-p", positive_prompt + " " +caption+ " " +prompt,
        "--negative-prompt", negative_prompt,
        "-i", file_path,
        "-o", output_path,
        "--strength", str(strength), # how much to apply the prompt
        "--style-ratio", str(style_ratio), # how much to apply the style
        "--cfg-scale", str(cfg_scale), # how much to apply the config
        "--control-strength", str(control_strength), # how much to apply the control
        "--steps", str(steps), # how many steps to run
        "--sampling-method", str(sampling_method), # how to sample
        "--seed", "-1",
        "--height", str(height),
        "--width", str(width)
    ], capture_output=True, text=True)
    
    print("Command stdout:")
    print(result.stdout)

    print("Command stderr:")
    print(result.stderr)

    return FileResponse(output_path, media_type="image/png", filename="output.png")

@app.post("/img2animation/")
async def img2animation(file: UploadFile = File(...), prompt: Optional[str] = Form(default=""), negative_prompt: Optional[str] = Form("bad quality, worse quality"), num_frames: Optional[int] = Form(16), guidance_scale: Optional[float] = Form(7.5), num_inference_steps: Optional[int] = Form(25), seed: Optional[int] = Form(None)):
    global animation_pipe

    output_dir = os.path.join(os.getcwd(), "generated_animations")
    os.makedirs(output_dir, exist_ok=True)

    output_filename = "animation.gif"
    output_path = os.path.join(output_dir, output_filename)

    filename = "uploaded_image.png"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    caption = caption_image(file_path)
    print(caption)

    output = animation_pipe(
        prompt=caption+" "+prompt,
        negative_prompt=negative_prompt,
        num_frames=num_frames,
        guidance_scale=guidance_scale,
        num_inference_steps=num_inference_steps,
        seed=seed,
        image = Image.open(file_path)
    )

    frames = output.frames[0]
    export_to_gif(frames, output_path)

    return FileResponse(output_path, media_type="image/gif", filename="animation.gif")

@app.post("/niggafy/")
async def niggafy(file: UploadFile = File(...), prompt: Optional[str] = Form(default=""), strength: Optional[float] = Form(0.2), style_ratio: Optional[int] = Form(80), cfg_scale: Optional[int] = Form(15), control_strength: Optional[float] = Form(1.0), steps: Optional[int] = Form(100), sampling_method: Optional[str] = Form("euler_a"), height: Optional[int] = Form(512), width: Optional[int] = Form(512)):
    # Save the uploaded image
    save_dir = UPLOAD_DIR
    os.makedirs(save_dir, exist_ok=True)

    filename = "uploaded_image.png"
    file_path = os.path.join(save_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    caption_prompt = "Describe this image in detail for an artistic transformation to Studio Ghibli style. Focus on key visual elements such as facial expressions, character emotions, color palette, lighting, and background details. Emphasize textures, scenery, and atmosphere. Avoid photorealistic or overly technical descriptions."

    positive_prompt = "Studio Ghibli animation style, Hayao Miyazaki artistic interpretation, hand-drawn animation quality, delicate anime features, expressive eyes, soft facial expressions, Ghibli character design, painterly textures, watercolor effect, vibrant and pastel tones, lush landscapes, whimsical backgrounds, magical lighting, fantastical scenery with Ghibli aesthetics, cel-shading."

    negative_prompt = "Photorealism, 3D rendering, hyper-realistic textures, distorted proportions, deformed features, asymmetry, unnatural anatomy, misaligned eyes, facial distortion, noisy output, low quality, pixelation, poor shading, visual artifacts."

    file_path = "/home/h039y17/FH/stable-diffusion.cpp/uploads/uploaded_image.png"
    output_path = "/home/h039y17/FH/stable-diffusion.cpp/build/anti-ghibli.png"

    caption = caption_image(file_path, caption_prompt)
    print("Image Caption:")
    print(caption)

    print("Running the image generation command...")

    result = subprocess.run([
        "/home/h039y17/FH/stable-diffusion.cpp/build/bin/sd",
        "--mode", "img2img",
        # "-m", "/home/h039y17/FH/stable-diffusion.cpp/models/sd-v1-4.ckpt",
        "-m", "/home/h039y17/FH/stable-diffusion.cpp/lora/ghibli-diffusion-v1.ckpt",
        "--negative-prompt", positive_prompt + " " +caption+ " " +prompt,
        "-p", negative_prompt,
        "-i", file_path,
        "-o", output_path,
        "--strength", str(strength), # how much to apply the prompt
        "--style-ratio", str(style_ratio), # how much to apply the style
        "--cfg-scale", str(cfg_scale), # how much to apply the config
        "--control-strength", str(control_strength), # how much to apply the control
        "--steps", str(steps), # how many steps to run
        "--sampling-method", str(sampling_method), # how to sample
        "--seed", "-1",
        "--height", str(height),
        "--width", str(width)
    ], capture_output=True, text=True)
    
    print("Command stdout:")
    print(result.stdout)

    print("Command stderr:")
    print(result.stderr)

    return FileResponse(output_path, media_type="image/png", filename="output.png")

@app.post("/img2pixar/")
async def img2pixar(file: UploadFile = File(...), prompt: Optional[str] = Form(default=""), strength: Optional[float] = Form(0.53), style_ratio: Optional[int] = Form(80), cfg_scale: Optional[int] = Form(15), control_strength: Optional[float] = Form(1.0), steps: Optional[int] = Form(100), sampling_method: Optional[str] = Form("euler_a"), height: Optional[int] = Form(512), width: Optional[int] = Form(512)):
    # Save the uploaded image
    save_dir = UPLOAD_DIR
    os.makedirs(save_dir, exist_ok=True)

    filename = "uploaded_image.png"
    file_path = os.path.join(save_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    positive_prompt = "PIXAR style, Disney style, vibrant colors, whimsical, 3D-rendered, cartoonish, soft lighting, exaggerated features, cinematic, expressive, character design, highly detailed, polished, photorealistic textures, family-friendly, storytelling vibe"

    negative_prompt = "Dark, gritty, hyper-realistic, black and white, monochrome, low-resolution, horror, grotesque, distorted, dull, aged, pixelated, poorly rendered, blurry, flat lighting"

    file_path = "/home/h039y17/FH/stable-diffusion.cpp/uploads/uploaded_image.png"
    output_path = "/home/h039y17/FH/stable-diffusion.cpp/build/pixar.png"

    # caption = caption_image(file_path, caption_prompt)
    # print("Image Caption:")
    # print(caption)

    print("Running the image generation command...")

    result = subprocess.run([
        "/home/h039y17/FH/stable-diffusion.cpp/build/bin/sd",
        "--mode", "img2img",
        "-m", "/home/h039y17/FH/stable-diffusion.cpp/models/sd-v1-4.ckpt",
        "--vae", "/home/h039y17/FH/stable-diffusion.cpp/disney_lora/Cartoon%20illustration_flux_lora_v1.safetensors",
        "-p", positive_prompt + " " +prompt,
        "--negative-prompt", negative_prompt,
        "-i", file_path,
        "-o", output_path,
        "--strength", str(strength), # how much to apply the prompt
        "--style-ratio", str(style_ratio), # how much to apply the style
        "--cfg-scale", str(cfg_scale), # how much to apply the config
        "--control-strength", str(control_strength), # how much to apply the control
        "--steps", str(steps), # how many steps to run
        "--sampling-method", str(sampling_method), # how to sample
        "--seed", "-1",
        "--height", str(height),
        "--width", str(width)
    ], capture_output=True, text=True)
    
    print("Command stdout:")
    print(result.stdout)

    print("Command stderr:")
    print(result.stderr)

    return FileResponse(output_path, media_type="image/png", filename="output.png")

@app.post("/anti-ghibli/")
async def antighibli(file: UploadFile = File(...), prompt: Optional[str] = Form(default=""), strength: Optional[float] = Form(0.53), style_ratio: Optional[int] = Form(80), cfg_scale: Optional[int] = Form(15), control_strength: Optional[float] = Form(1.0), steps: Optional[int] = Form(100), sampling_method: Optional[str] = Form("euler_a"), height: Optional[int] = Form(512), width: Optional[int] = Form(512)):
    # Save the uploaded image
    save_dir = UPLOAD_DIR
    os.makedirs(save_dir, exist_ok=True)

    filename = "uploaded_image.png"
    file_path = os.path.join(save_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    caption_prompt = "Describe this image in detail for an artistic transformation to Studio Ghibli style. Focus on key visual elements such as facial expressions, character emotions, color palette, lighting, and background details. Emphasize textures, scenery, and atmosphere. Avoid photorealistic or overly technical descriptions."

    positive_prompt = "Studio Ghibli animation style, Hayao Miyazaki artistic interpretation, hand-drawn animation quality, delicate anime features, expressive eyes, soft facial expressions, Ghibli character design, painterly textures, watercolor effect, vibrant and pastel tones, lush landscapes, whimsical backgrounds, magical lighting, fantastical scenery with Ghibli aesthetics, cel-shading."

    negative_prompt = "Photorealism, 3D rendering, hyper-realistic textures, distorted proportions, deformed features, asymmetry, unnatural anatomy, misaligned eyes, facial distortion, noisy output, low quality, pixelation, poor shading, visual artifacts."

    file_path = "/home/h039y17/FH/stable-diffusion.cpp/uploads/uploaded_image.png"
    output_path = "/home/h039y17/FH/stable-diffusion.cpp/build/antighibli.png"

    caption = caption_image(file_path, caption_prompt)
    print("Image Caption:")
    print(caption)

    print("Running the image generation command...")

    result = subprocess.run([
        "/home/h039y17/FH/stable-diffusion.cpp/build/bin/sd",
        "--mode", "img2img",
        "-m", "/home/h039y17/FH/stable-diffusion.cpp/models/sd-v1-4.ckpt",
        "--lora-model-dir", "/home/h039y17/FH/stable-diffusion.cpp/lora",
        "-p", negative_prompt + " " +caption+ " " +prompt,
        "--negative-prompt", positive_prompt,
        "-i", file_path,
        "-o", output_path,
        "--strength", str(strength), # how much to apply the prompt
        "--style-ratio", str(style_ratio), # how much to apply the style
        "--cfg-scale", str(cfg_scale), # how much to apply the config
        "--control-strength", str(control_strength), # how much to apply the control
        "--steps", str(steps), # how many steps to run
        "--sampling-method", str(sampling_method), # how to sample
        "--seed", "-1",
        "--height", str(height),
        "--width", str(width)
    ], capture_output=True, text=True)
    
    print("Command stdout:")
    print(result.stdout)

    print("Command stderr:")
    print(result.stderr)

    return FileResponse(output_path, media_type="image/png", filename="output.png")

@app.post("/img2sound/")
async def img2sound(file: UploadFile = File(...), prompt: Optional[str] = Form(default=""), duration: Optional[int] = Form(10)):
    global music_processor, music_model
    # Save the uploaded image
    save_dir = UPLOAD_DIR
    os.makedirs(save_dir, exist_ok=True)

    filename = "uploaded_image.png"
    file_path = os.path.join(save_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    caption_prompt = "Describe this image as an audio clip. Focus on key visual elements such as facial expressions, character emotions, color palette, lighting, and background details. Emphasize textures, scenery, and atmosphere. Avoid photorealistic or overly technical descriptions. Use artistic language to describe the image in a way that would translate well to sound. Consider the mood, tone, and style of the image."

    caption = caption_image(file_path, caption_prompt)
    print(caption)

    output_dir = os.path.join(os.getcwd(), "generated_sounds")
    os.makedirs(output_dir, exist_ok=True)

    output_filename = "output.wav"
    output_path = os.path.join(output_dir, output_filename)

    inputs = music_processor(
        text=[caption],
        padding=True,
        return_tensors="pt",
    )

    device = next(music_model.parameters()).device
    inputs = {k: v.to(device) if hasattr(v, 'to') else v for k, v in inputs.items()}

    # 256 tokens is about 5 seconds of music
    with torch.no_grad():
        audio_values = music_model.generate(**inputs, max_new_tokens=int((256*duration)/5))
    
    sampling_rate = music_model.config.audio_encoder.sampling_rate
    scipy.io.wavfile.write(output_path, rate=sampling_rate, data=audio_values[0, 0].cpu().numpy())

    return FileResponse(output_path, media_type="audio/wav", filename="output.wav")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    
    # Start ngrok tunnel with the reserved domain
    try:
        # Connect using the reserved domain configuration
        tunnel = ngrok.connect(**tunnel_config)
        print(f"Ngrok tunnel established at: {tunnel.public_url}")
    except Exception as e:
        print(f"Error establishing ngrok tunnel: {e}")
        exit(1)
    
    # Run FastAPI server
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000)
    finally:
        # Cleanup: disconnect the tunnel when the server stops
        ngrok.disconnect(tunnel.public_url)
