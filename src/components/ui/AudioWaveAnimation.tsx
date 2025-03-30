import React, { useEffect, useRef } from 'react';

interface AudioWaveAnimationProps {
  color?: string;
}

const AudioWaveAnimation: React.FC<AudioWaveAnimationProps> = ({ 
  color = "#4f46e5" 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Wave parameters for floating effect
    const waves = [
      { frequency: 0.006, amplitude: 30, speed: 2.9, offset: 0, opacity: 0.6 },
      { frequency: 0.007, amplitude: 28, speed: 2.8, offset: 4, opacity: 0.3 },
      { frequency: 0.008, amplitude: 32, speed: 2.7, offset: 8, opacity: 0.4 },
      { frequency: 0.009, amplitude: 35, speed: 2.75, offset: 12, opacity: 0.6 },
      { frequency: 0.01, amplitude: 38, speed: 3.5, offset: 6, opacity: 0.4 },
      { frequency: 0.0085, amplitude: 40, speed: 3.2, offset: 10, opacity: 0.5 },
      { frequency: 0.0115, amplitude: 36, speed: 3.0, offset: 2, opacity: 0.35 },
      { frequency: 0.0095, amplitude: 42, speed: 2.6, offset: 15, opacity: 0.45 },
    ];
    
    // Animation function
    function animate() {
      if (!canvas || !ctx) return;
      
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
      
      // Draw each wave
      waves.forEach(wave => {
        const { frequency, amplitude, speed, offset, opacity } = wave;
        
        ctx.beginPath();
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : { r: 0, g: 0, b: 255 };
        };
        
        const rgb = hexToRgb(color);
        
        // Enhanced gradient for smoother transitions
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        gradient.addColorStop(0.2, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5})`);
        gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`);
        gradient.addColorStop(0.8, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        
        // Draw the forward wave
        const points: [number, number][] = [];
        const step = 2;
        
        // First pass - calculate points for the top curve
        for (let x = -100; x <= width + 100; x += step) {
          const xPos = x + (elapsedTime * speed * 50);
          const primaryWave = Math.sin(xPos * frequency + offset);
          const secondaryWave = 0.5 * Math.sin(xPos * frequency * 1.5 + offset * 1.1);
          const tertiaryWave = 0.25 * Math.sin(xPos * frequency * 2 + offset * 1.2);
          
          const combinedWave = primaryWave + secondaryWave + tertiaryWave;
          const breathingEffect = 1 + 0.05 * Math.sin(elapsedTime * 0.5);
          
          const y = height / 2 + combinedWave * amplitude * breathingEffect;
          points.push([x, y]);
        }
        
        // Draw the complete wave (top and bottom curves)
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        
        // Draw top curve
        points.forEach(point => {
          ctx.lineTo(point[0], point[1]);
        });
        
        // Draw bottom curve (mirror of top curve with reduced amplitude)
        for (let i = points.length - 1; i >= 0; i--) {
          const [x, y] = points[i];
          const centerY = height / 2;
          const distanceFromCenter = y - centerY;
          const mirroredY = centerY - distanceFromCenter * 0.8; // 0.8 to slightly reduce bottom amplitude
          ctx.lineTo(x, mirroredY);
        }
        
        ctx.closePath();
        
        // Fill the wave
        ctx.fillStyle = gradient;
        ctx.globalAlpha = opacity;
        ctx.fill();
      });
      
      // Request next frame
      animationRef.current = requestAnimationFrame(animate);
    }
    
    // Start animation
    animate();
    
    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [color]);
  
  return (
    <div className="relative w-full overflow-hidden" style={{ height: '180px' }}>
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full"
        style={{ transform: 'scale(1.1)' }}
      />
    </div>
  );
};

export default AudioWaveAnimation; 