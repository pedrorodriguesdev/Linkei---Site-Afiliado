import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createEarthRotationLoop } from './earthRuntime';

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
    float illumination = 0.35 + 0.65 * pow(max(sun, 0.0), 0.65);
    float cityLights = max((night.r + night.g + night.b) / 3.0 - 0.23, 0.0) * 3.2;
    vec3 darkness = day * vec3(0.10, 0.16, 0.29) + vec3(2.1, 1.6, 0.72) * cityLights;
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
    gl_FragColor = vec4(vec3(0.10, 0.37, 1.0), rim * light * 0.73);
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
    let failed = false;
    let shown = false;
    let inView = false;
    let hasSize = false;
    let shaderFailed = false;
    let observer: IntersectionObserver | undefined;
    let resize: ResizeObserver | undefined;
    let loop: ReturnType<typeof createEarthRotationLoop> | undefined;
    const textures: THREE.Texture[] = [];
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const fail = () => {
      if (disposed || failed) return;
      failed = true;
      loop?.setActive(false);
      callbacks.current.onFailure();
    };
    const sync = () => loop?.setActive(!failed && inView && hasSize && !document.hidden);
    const onContextLost = (event: Event) => { event.preventDefault(); fail(); };
    const baseTilt = 14 * Math.PI / 180;
    let pointerTilt = 0;
    let pointerLean = 0;
    let pointerBounds: DOMRect | null = null;
    const resetPointer = () => { pointerTilt = 0; pointerLean = 0; pointerBounds = null; };
    const enterPointer = () => { pointerBounds = element.getBoundingClientRect(); };
    const pointer = (event: PointerEvent) => {
      if (!inView || !pointerBounds || event.pointerType !== 'mouse') return;
      const x = (event.clientX - pointerBounds.left) / pointerBounds.width - 0.5;
      const y = (event.clientY - pointerBounds.top) / pointerBounds.height - 0.5;
      pointerTilt = Math.max(-0.018, Math.min(0.018, y * 0.035));
      pointerLean = Math.max(-0.012, Math.min(0.012, x * 0.025));
    };
    const visibility = () => { if (document.hidden) resetPointer(); sync(); };
    try {
      // Allocate only the renderer we actually use. Construction can still fail despite API availability.
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.debug.checkShaderErrors = true;
      renderer.debug.onShaderError = () => { shaderFailed = true; };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
      camera.position.z = 3.72;
      const group = new THREE.Group();
      group.rotation.x = baseTilt;
      scene.add(group);
      const globe = new THREE.Group();
      globe.rotation.y = -25 * Math.PI / 180;
      group.add(globe);
      const sun = new THREE.Vector3(-0.8, 0.45, 0.4).normalize();
      const loader = new THREE.TextureLoader();
      const texture = (url: string) => new Promise<THREE.Texture>((resolve, reject) => loader.load(url, t => {
        if (disposed || failed) { t.dispose(); reject(new Error('Earth no longer active')); return; }
        t.anisotropy = Math.min(renderer!.capabilities.getMaxAnisotropy(), 4);
        textures.push(t);
        resolve(t);
      }, undefined, reject));
      Promise.all([texture('/earth/day.webp'), texture('/earth/night.webp'), texture('/earth/clouds.webp')]).then(([day, night, clouds]) => {
        if (disposed || failed) return;
        const geometry = new THREE.SphereGeometry(1, 64, 48); geometries.push(geometry);
        const surface = new THREE.ShaderMaterial({ vertexShader, fragmentShader: surfaceShader, uniforms: { dayMap: { value: day }, nightMap: { value: night }, sunDirection: { value: sun } } });
        const cloudMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader: cloudsShader, transparent: true, depthWrite: false, uniforms: { cloudMap: { value: clouds }, sunDirection: { value: sun } } });
        const atmosphere = new THREE.ShaderMaterial({ vertexShader, fragmentShader: atmosphereShader, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        materials.push(surface, cloudMaterial, atmosphere);
        globe.add(new THREE.Mesh(geometry, surface));
        const cloudMesh = new THREE.Mesh(geometry, cloudMaterial); cloudMesh.scale.setScalar(1.006); globe.add(cloudMesh);
        const atmosphereMesh = new THREE.Mesh(geometry, atmosphere); atmosphereMesh.scale.setScalar(1.027); group.add(atmosphereMesh);
        loop = createEarthRotationLoop({
          requestFrame: callback => window.requestAnimationFrame(callback),
          cancelFrame: handle => window.cancelAnimationFrame(handle),
          onError: fail,
          onFrame: ({ angle, deltaSeconds }) => {
            globe.rotation.y = angle;
            const damping = 1 - Math.exp(-3.8 * deltaSeconds);
            group.rotation.x += (baseTilt + pointerTilt - group.rotation.x) * damping;
            group.rotation.z += (pointerLean - group.rotation.z) * damping;
            cloudMesh.rotation.y += deltaSeconds * 0.0005;
            renderer!.render(scene, camera);
            if (shaderFailed || renderer!.getContext().isContextLost()) throw new Error('Earth frame unavailable');
            // Never hide the fallback merely because textures loaded or a canvas was appended.
            if (!shown) { shown = true; callbacks.current.onReady(); }
          },
        });
        const size = () => {
          if (disposed || failed) return;
          const width = element.clientWidth;
          const height = element.clientHeight;
          hasSize = width > 0 && height > 0;
          if (hasSize) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer!.setSize(width, height, false);
          }
          resetPointer();
          sync();
        };
        resize = new ResizeObserver(size);
        resize.observe(element);
        size();
        observer = new IntersectionObserver(entries => {
          inView = entries.some(entry => entry.isIntersecting);
          if (!inView) resetPointer();
          sync();
        });
        observer.observe(element);
        document.addEventListener('visibilitychange', visibility);
        element.addEventListener('pointerenter', enterPointer, { passive: true });
        element.addEventListener('pointermove', pointer, { passive: true });
        element.addEventListener('pointerleave', resetPointer, { passive: true });
        element.addEventListener('pointercancel', resetPointer, { passive: true });
        window.addEventListener('blur', resetPointer);
      }).catch(fail);
    } catch { fail(); }
    return () => {
      disposed = true;
      loop?.dispose();
      observer?.disconnect();
      resize?.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      element.removeEventListener('pointerenter', enterPointer);
      element.removeEventListener('pointermove', pointer);
      element.removeEventListener('pointerleave', resetPointer);
      element.removeEventListener('pointercancel', resetPointer);
      window.removeEventListener('blur', resetPointer);
      textures.forEach(texture => texture.dispose());
      materials.forEach(material => material.dispose());
      geometries.forEach(geometry => geometry.dispose());
      if (renderer) {
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
  }, []);
  return <div ref={host} className="earth-canvas" />;
}
