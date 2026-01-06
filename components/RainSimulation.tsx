import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface RainSimulationProps {
  config: {
    rainAmount: number;
    speed: number;
    size: number;
    fog: number;
    refraction: number;
    backgroundUrl: string | null;
    isVideo: boolean;
  };
}

const RainSimulation: React.FC<RainSimulationProps> = ({ config }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    material: THREE.ShaderMaterial;
    clock: THREE.Clock;
    rainTime: number;
    videoElement?: HTMLVideoElement;
    animationId?: number;
  } | null>(null);

  // We use a ref to track config inside the animation loop to avoid re-binding the loop
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
    
    // Update uniforms immediately when config changes
    if (sceneRef.current) {
      const { material } = sceneRef.current;
      material.uniforms.uRain.value = config.rainAmount;
      material.uniforms.uFog.value = config.fog;
      material.uniforms.uRefract.value = config.refraction;
      material.uniforms.uSize.value = config.size;
      // Note: uSpeed is NOT passed to shader anymore to fix the glitch. 
      // It is used in the JS loop calculation instead.
    }
  }, [config]);

  // Handle Background Texture Updates
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const { material } = sceneRef.current;
    
    const setupTexture = (texture: THREE.Texture) => {
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      material.uniforms.iChannel0.value = texture;
      material.needsUpdate = true;
    };

    if (config.backgroundUrl) {
      if (config.isVideo) {
        // Cleanup old video if exists
        if (sceneRef.current.videoElement) {
            sceneRef.current.videoElement.pause();
            sceneRef.current.videoElement.src = "";
            sceneRef.current.videoElement = undefined;
        }

        const video = document.createElement('video');
        video.src = config.backgroundUrl;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        
        video.oncanplay = () => {
          video.play().catch(e => console.error("Video play error", e));
          const videoTexture = new THREE.VideoTexture(video);
          setupTexture(videoTexture);
        };
        video.load();
        sceneRef.current.videoElement = video;
      } else {
        new THREE.TextureLoader().load(config.backgroundUrl, setupTexture);
      }
    } else {
        // Default Gradient Background
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const g = ctx.createLinearGradient(0, 0, 0, 1024);
            g.addColorStop(0, '#0f172a');
            g.addColorStop(1, '#334155');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 1024, 1024);
            const tex = new THREE.CanvasTexture(canvas);
            setupTexture(tex);
        }
    }
  }, [config.backgroundUrl, config.isVideo]);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Shader Definitions ---
    const vertexShader = `
      varying vec2 vUv; 
      void main() { 
        vUv = uv; 
        gl_Position = vec4(position, 1.0); 
      }
    `;

    const fragmentShader = `
      uniform float iTime;
      uniform vec2 iResolution;
      uniform sampler2D iChannel0;
      uniform float uRain;
      uniform float uFog;
      uniform float uRefract;
      uniform float uSize;
      
      varying vec2 vUv;

      #define S(a, b, t) smoothstep(a, b, t)

      vec3 N13(float p) {
         vec3 p3 = fract(vec3(p) * vec3(.1031,.11369,.13787));
         p3 += dot(p3, p3.yzx + 19.19);
         return fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
      }
      float N(float t) { return fract(sin(t*12345.564)*7658.76); }
      float Saw(float b, float t) { return S(0., b, t)*S(1., b, t); }

      vec2 DropLayer(vec2 uv, float t) {
          vec2 UV = uv;
          uv.y += t*0.75;
          vec2 a = vec2(6., 1.);
          vec2 grid = a*2.;
          vec2 id = floor(uv*grid);
          float colShift = N(id.x); 
          uv.y += colShift;
          id = floor(uv*grid);
          vec3 n = N13(id.x*35.2+id.y*2376.1);
          vec2 st = fract(uv*grid)-vec2(.5, 0);
          float x = n.x-.5;
          float y = UV.y*20.;
          float wiggle = sin(y+sin(y));
          x += wiggle*(.5-abs(x))*(n.z-.5);
          x *= .7;
          float ti = fract(t+n.z);
          y = (Saw(.85, ti)-.5)*.9+.5;
          vec2 p = vec2(x, y);
          float d = length((st-p)*a.yx);
          
          float mainDrop = S(.4, .05, d);
          
          float r = sqrt(S(1., y, st.y));
          float cd = abs(st.x-x);
          float trail = S(.23*r, .15*r*r, cd);
          float trailFront = S(-.02, .02, st.y-y);
          trail *= trailFront*r*r;
          
          y = fract(UV.y*10.)+(st.y-.5);
          float dd = length(st-vec2(x, y));
          float droplets = S(.3, 0., dd);
          
          float m = mainDrop + droplets*r*trailFront;
          return vec2(m, trail);
      }

      float StaticDrops(vec2 uv, float t) {
          uv *= 40.;
          vec2 id = floor(uv);
          uv = fract(uv)-.5;
          vec3 n = N13(id.x*107.45+id.y*3543.654);
          vec2 p = (n.xy-.5)*.7;
          float d = length(uv-p);
          float fade = Saw(.025, fract(t+n.z));
          return S(.3, 0., d)*fract(n.z*10.)*fade;
      }

      vec2 Drops(vec2 uv, float t, float l0, float l1, float l2) {
          vec2 scaledUV = uv / uSize; 
          float s = StaticDrops(scaledUV, t)*l0; 
          vec2 m1 = DropLayer(scaledUV, t)*l1;
          vec2 m2 = DropLayer(scaledUV*1.85, t)*l2;
          float c = s+m1.x+m2.x;
          c = S(.3, 1., c);
          return vec2(c, max(m1.y*l0, m2.y*l1));
      }

      void main() {
          vec2 uv = (gl_FragCoord.xy-.5*iResolution.xy) / iResolution.y;
          vec2 UV = vUv;
          
          // FIX: The time logic here now just receives a smoothly incrementing value
          // We removed uSpeed from here. We scale it by 0.2 to match original aesthetic.
          float t = iTime * 0.2;
          
          float rainAmt = uRain;
          float staticDrops = S(-.5, 1., rainAmt)*2.;
          float layer1 = S(.25, .75, rainAmt);
          float layer2 = S(.0, .5, rainAmt);
          
          vec2 c = Drops(uv, t, staticDrops, layer1, layer2);
          
          vec2 e = vec2(.002, 0.);
          float cx = Drops(uv+e, t, staticDrops, layer1, layer2).x;
          float cy = Drops(uv+e.yx, t, staticDrops, layer1, layer2).x;
          vec2 n = vec2(cx-c.x, cy-c.x); 
          
          float wetMask = S(0.0, 0.2, c.x + c.y);
          float focus = mix(uFog * 7.0, 0.0, wetMask);
          
          vec2 offset = n * uRefract;
          vec3 col = texture2D(iChannel0, UV + offset, focus).rgb;
          
          vec3 lightDir = normalize(vec3(0.3, 0.5, 0.4));
          vec3 normal = normalize(vec3(n, 0.1)); 
          float spec = pow(max(0.0, dot(normal, lightDir)), 20.0);
          col += spec * 0.4 * wetMask; 
          
          col *= 1. - dot(UV-0.5, UV-0.5) * 0.6;
          gl_FragColor = vec4(col, 1.0);
      }
    `;

    // --- Initialization ---
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Default placeholder texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const g = ctx.createLinearGradient(0,0,0,1024);
        g.addColorStop(0, '#0f172a'); g.addColorStop(1, '#334155');
        ctx.fillStyle = g; ctx.fillRect(0,0,1024,1024);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearMipmapLinearFilter;

    const material = new THREE.ShaderMaterial({
        uniforms: {
            iTime: { value: 0 },
            iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            iChannel0: { value: tex },
            uRain: { value: config.rainAmount }, 
            uFog: { value: config.fog }, 
            uRefract: { value: config.refraction },
            uSize: { value: config.size },
        },
        vertexShader,
        fragmentShader
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    const clock = new THREE.Clock();

    sceneRef.current = {
        scene,
        camera,
        renderer,
        material,
        clock,
        rainTime: 0,
    };

    // --- Animation Loop ---
    const animate = () => {
        if (!sceneRef.current) return;
        const { renderer, scene, camera, material, clock } = sceneRef.current;
        
        // --- KEY FIX FOR RAIN SPEED ---
        // Instead of passing Speed to the shader and multiplying total time,
        // we assume 'speed' is how fast time passes.
        // We accumulate time based on the delta * current_speed.
        const dt = clock.getDelta();
        sceneRef.current.rainTime += dt * configRef.current.speed;

        material.uniforms.iTime.value = sceneRef.current.rainTime;
        renderer.render(scene, camera);
        
        sceneRef.current.animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
        if (!sceneRef.current) return;
        const { renderer, material } = sceneRef.current;
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        if (sceneRef.current?.animationId) cancelAnimationFrame(sceneRef.current.animationId);
        if (containerRef.current) containerRef.current.innerHTML = '';
        renderer.dispose();
    };
  }, []); // Only run once on mount (initial setup)

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
};

export default RainSimulation;