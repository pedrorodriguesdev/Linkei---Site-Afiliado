import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = { onReady: () => void; onFailure: () => void };
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const surfaceShader = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(cameraPosition - vPosition);
    float sun = dot(normal, sunDirection);
    float daylight = smoothstep(-0.12, 0.38, sun);
    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    float illumination = 0.4 + 0.6 * pow(max(sun, 0.0), 0.65);
    float cityLights = max((night.r + night.g + night.b) / 3.0 - 0.23, 0.0) * 3.2;
    vec3 darkness = day * vec3(0.12, 0.20, 0.35) + vec3(1.8, 1.45, 0.7) * cityLights;
    vec3 color = mix(darkness, day * illumination, daylight);
    float ocean = smoothstep(0.0, 0.12, day.b - day.r);
    float specular = pow(max(dot(reflect(-sunDirection, normal), view), 0.0), 28.0);
    color += vec3(0.18, 0.31, 0.45) * specular * ocean * daylight * 0.3;
    float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);
    color += vec3(0.035, 0.19, 0.47) * fresnel * (0.45 + 0.55 * max(sun, 0.0));
    gl_FragColor = vec4(color, 1.0);
  }
`;
const cloudsShader = `
  uniform sampler2D cloudMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    float sun = dot(normalize(vNormal), sunDirection);
    float amount = smoothstep(-0.12, 0.38, sun);
    float cloud = texture2D(cloudMap, vUv).r;
    gl_FragColor = vec4(vec3(0.79, 0.87, 1.0) * (0.3 + 0.7 * max(sun, 0.0)), cloud * (0.30 + 0.35 * amount));
  }
`;
const atmosphereShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 view = normalize(cameraPosition - vPosition);
    float rim = pow(1.0 - abs(dot(normalize(vNormal), view)), 4.0);
    float light = 0.55 + 0.45 * clamp(-vNormal.x + 0.4 * vNormal.y, 0.0, 1.0);
    gl_FragColor = vec4(vec3(0.10, 0.37, 1.0), rim * light * 0.65);
  }
`;

export default function DesktopEarth({ onReady, onFailure }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onFailure });
  callbacks.current = { onReady, onFailure };
  useEffect(() => {
    const element = host.current!;
    let renderer: THREE.WebGLRenderer | undefined;
    let disposed = false;
    let frame = 0;
    let lastTime = 0;
    let inView = false;
    let angle = -25 * Math.PI / 180;
    let observer: IntersectionObserver | undefined;
    let resize: ResizeObserver | undefined;
    let cleanupVisibility: (() => void) | undefined;
    let cleanupPointer: (() => void) | undefined;
    const textures: THREE.Texture[] = [];
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const fail = () => { if (!disposed) callbacks.current.onFailure(); };
    const onContextLost = (event: Event) => { event.preventDefault(); fail(); };
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
      camera.position.z = 3.72;
      const group = new THREE.Group();
      const baseTilt = 14 * Math.PI / 180;
      group.rotation.x = baseTilt;
      let pointerTilt = 0;
      let pointerLean = 0;
      const pointer = (event: PointerEvent) => {
        if (!inView || event.pointerType !== 'mouse') return;
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        pointerTilt = Math.max(-0.02, Math.min(0.02, y * 0.035));
        pointerLean = Math.max(-0.012, Math.min(0.012, x * 0.025));
      };
      document.addEventListener('pointermove', pointer, { passive: true });
      cleanupPointer = () => document.removeEventListener('pointermove', pointer);
      scene.add(group);
      const globe = new THREE.Group();
      globe.rotation.y = angle;
      group.add(globe);
      const sun = new THREE.Vector3(-0.8, 0.45, 0.4).normalize();
      const loader = new THREE.TextureLoader();
      const texture = (url: string) => new Promise<THREE.Texture>((resolve, reject) => loader.load(url, t => {
        if (disposed) { t.dispose(); reject(new Error('Disposed')); return; }
        t.anisotropy = Math.min(renderer!.capabilities.getMaxAnisotropy(), 4);
        textures.push(t); resolve(t);
      }, undefined, reject));
      Promise.all([texture('/earth/day.webp'), texture('/earth/night.webp'), texture('/earth/clouds.webp')]).then(([day, night, clouds]) => {
        if (disposed) return;
        const geometry = new THREE.SphereGeometry(1, 64, 48); geometries.push(geometry);
        const surface = new THREE.ShaderMaterial({ vertexShader, fragmentShader: surfaceShader, uniforms: { dayMap: { value: day }, nightMap: { value: night }, sunDirection: { value: sun } } });
        const cloudMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader: cloudsShader, transparent: true, depthWrite: false, uniforms: { cloudMap: { value: clouds }, sunDirection: { value: sun } } });
        const atmosphere = new THREE.ShaderMaterial({ vertexShader, fragmentShader: atmosphereShader, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        materials.push(surface, cloudMaterial, atmosphere);
        globe.add(new THREE.Mesh(geometry, surface));
        const cloudMesh = new THREE.Mesh(geometry, cloudMaterial); cloudMesh.scale.setScalar(1.006); globe.add(cloudMesh);
        const atmosphereMesh = new THREE.Mesh(geometry, atmosphere); atmosphereMesh.scale.setScalar(1.035); group.add(atmosphereMesh);
        const render = (now: number) => {
          frame = 0;
          if (disposed || !inView || document.hidden) { lastTime = 0; return; }
          const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
          lastTime = now;
          angle += dt * Math.PI * 2 / 180;
          globe.rotation.y = angle;
          group.rotation.x += (baseTilt + pointerTilt - group.rotation.x) * 0.035;
          group.rotation.z += (pointerLean - group.rotation.z) * 0.035;
          cloudMesh.rotation.y += dt * 0.0005;
          renderer!.render(scene, camera);
          frame = requestAnimationFrame(render);
        };
        const resume = () => {
          if (disposed) return;
          if (!inView || document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
          else if (!frame) frame = requestAnimationFrame(render);
        };
        const size = () => {
          const width = element.clientWidth; const height = element.clientHeight;
          if (!width || !height || disposed) return;
          camera.aspect = width / height; camera.updateProjectionMatrix();
          renderer!.setSize(width, height, false);
          renderer!.render(scene, camera);
        };
        resize = new ResizeObserver(size); resize.observe(element); size();
        observer = new IntersectionObserver(entries => { inView = entries.some(entry => entry.isIntersecting); resume(); }); observer.observe(element);
        document.addEventListener('visibilitychange', resume);
        cleanupVisibility = () => document.removeEventListener('visibilitychange', resume);
        callbacks.current.onReady();
      }).catch(fail);
    } catch { fail(); }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect(); resize?.disconnect(); cleanupVisibility?.(); cleanupPointer?.();
      textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
      if (renderer) { renderer.domElement.removeEventListener('webglcontextlost', onContextLost); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); }
    };
  }, []);
  return <div ref={host} className="earth-canvas" />;
}
