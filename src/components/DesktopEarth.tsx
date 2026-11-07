import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createEarthRotationLoop, createEarthQualityGovernor, getEarthRenderProfile, EARTH_FRAME_TARGETS, EARTH_ANGULAR_VELOCITY, type EarthConnection } from './earthRuntime';

type Props = { onReady: () => void; onFailure: (reason?: string) => void };
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
  uniform sampler2D cloudMap;
  uniform float integratedClouds;
  uniform float cloudShift;
  uniform float cityExposure;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(cameraPosition - vPosition);
    float sun = dot(normal, sunDirection);
    float daylight = smoothstep(-0.10, 0.20, sun);
    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    // The sRGB albedo is decoded by Three/WebGL. All lighting below is linear.
    // Preserve bathymetry, coastlines and land biomes from the geographic atlas.
    float ocean = smoothstep(0.004, 0.035, day.b - max(day.r, day.g));
    float sunHeight = max(sun, 0.0);
    vec3 albedo = mix(day, day * vec3(0.76, 0.93, 1.06), ocean * 0.34);
    vec3 direct = vec3(1.08, 1.04, 0.98) * pow(sunHeight, 0.82);
    vec3 darkness = albedo * vec3(0.11, 0.16, 0.24) + vec3(0.0008, 0.0012, 0.0024);
    vec3 color = mix(darkness, albedo * (vec3(0.12, 0.145, 0.18) + direct), daylight);

    // Warm excess excludes the blue terrain in the night atlas. A soft shoulder
    // retains differences between cities instead of clipping whole urban regions.
    float warmLights = max(night.r - night.b * 0.95 - 0.008, 0.0);
    float cityLights = sqrt(1.0 - exp(-warmLights * 9.0 * cityExposure));
    float nightSide = 1.0 - smoothstep(-0.18, 0.16, sun);
    vec3 cityColor = mix(vec3(1.0, 0.48, 0.16), vec3(1.0, 0.86, 0.64), smoothstep(0.25, 0.90, cityLights));
    color += cityColor * cityLights * nightSide * (1.0 - ocean);

    // One offset atlas sample gives soft cloud shadows; no shadow maps or pass.
    vec2 cloudUv = vec2(fract(vUv.x + cloudShift), vUv.y);
    vec2 shadowUv = vec2(fract(cloudUv.x + 0.0018), min(cloudUv.y + 0.0009, 1.0));
    float cloudShadow = smoothstep(0.08, 0.82, texture2D(cloudMap, shadowUv).r);
    color *= 1.0 - cloudShadow * (0.10 + 0.13 * daylight);
    if (integratedClouds > 0.5) {
      float density = smoothstep(0.06, 0.84, texture2D(cloudMap, cloudUv).r);
      vec3 cloudColor = vec3(0.87, 0.94, 1.0) * (0.065 + 0.94 * pow(sunHeight, 0.75));
      color = mix(color, cloudColor, density * (0.42 + 0.32 * daylight));
    }
    // Dielectric water: a restrained broad sun glint plus a finer highlight.
    // Both depend on light AND view; neither creates a metallic ocean fill.
    vec3 halfway = normalize(sunDirection + view);
    float fresnelWater = 0.02 + 0.98 * pow(1.0 - max(dot(view, halfway), 0.0), 5.0);
    float specular = pow(max(dot(normal, halfway), 0.0), 110.0);
    float broadGlint = pow(max(dot(normal, halfway), 0.0), 28.0);
    color += vec3(0.72, 0.87, 1.0) * (specular * 2.8 + broadGlint * 0.20)
      * fresnelWater * ocean * sunHeight * (1.0 - cloudShadow * 0.75);
    float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 4.0);
    color += vec3(0.025, 0.16, 0.38) * fresnel * (0.04 + 0.30 * daylight);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;
const cloudsShader = `
  uniform sampler2D cloudMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    float sun = dot(normalize(vNormal), sunDirection);
    float amount = smoothstep(-0.10, 0.20, sun);
    float cloud = smoothstep(0.06, 0.84, texture2D(cloudMap, vUv).r);
    vec3 cloudColor = vec3(0.87, 0.94, 1.0) * (0.065 + 0.94 * pow(max(sun, 0.0), 0.75));
    gl_FragColor = vec4(cloudColor, cloud * (0.42 + 0.32 * amount));
    #include <colorspace_fragment>
  }
`;
const atmosphereShader = `
  uniform vec3 sunDirection;
  uniform float pointerPresence;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 view = normalize(cameraPosition - vPosition);
    float facing = abs(dot(normalize(vNormal), view));
    // Fade both the inner limb and the outer silhouette to avoid a neon band.
    float rim = pow(1.0 - facing, 3.6) * smoothstep(0.0, 0.16, facing);
    float sun = dot(normalize(vNormal), sunDirection);
    float dayLimb = smoothstep(-0.22, 0.35, sun);
    float light = 0.13 + 0.87 * dayLimb;
    vec3 atmosphereColor = mix(vec3(0.055, 0.065, 0.17), vec3(0.12, 0.42, 0.78), dayLimb);
    gl_FragColor = vec4(atmosphereColor, rim * light * (0.62 + pointerPresence * 0.04));
    #include <colorspace_fragment>
  }
`;

export default function DesktopEarth({ onReady, onFailure }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onFailure });
  callbacks.current = { onReady, onFailure };
  useEffect(() => {
    const element = host.current!;
    const device = navigator as Navigator & { deviceMemory?: number; connection?: EarthConnection };
    const wideMedia = matchMedia('(min-width: 1024px)');
    const pointerMedia = matchMedia('(pointer: fine) and (hover: hover)');
    const chooseProfile = () => getEarthRenderProfile({
      wide: wideMedia.matches, finePointer: pointerMedia.matches, reducedMotion: false,
      webgl2: true, observers: true, memory: device.deviceMemory,
      cores: device.hardwareConcurrency, connection: device.connection,
    });
    let profile = chooseProfile();
    const governor = createEarthQualityGovernor(profile.initialTier);
    const quality = () => Math.max(governor.tier, profile.initialTier);
    let cleanupResize = () => {};
    let pointerAttached = false;
    let renderer: THREE.WebGLRenderer | undefined;
    let disposed = false;
    let failed = false;
    let shown = false;
    let inView = false;
    let hasSize = false;
    let shaderFailed = false;
    let renderedFrames = 0;
    let diagnosticTime = -Infinity;
    let observer: IntersectionObserver | undefined;
    let resize: ResizeObserver | undefined;
    let loop: ReturnType<typeof createEarthRotationLoop> | undefined;
    const textures: THREE.Texture[] = [];
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const fail = (reason = 'initialization') => {
      if (disposed || failed) return;
      failed = true;
      loop?.setActive(false);
      element.dataset.earthState = 'failed:' + reason;
      callbacks.current.onFailure(reason);
    };
    const sync = () => {
      element.dataset.earthState = failed ? 'failed' : !hasSize ? 'waiting-size' : document.hidden ? 'hidden' : !inView ? 'offscreen' : 'running';
      loop?.setActive(!failed && inView && hasSize && !document.hidden);
    };
    const onContextLost = (event: Event) => { event.preventDefault(); fail('context'); };
    const baseTilt = 14 * Math.PI / 180;
    let pointerPresence = 0;
    let pointerTilt = 0;
    let pointerLean = 0;
    let pointerBounds: DOMRect | null = null;
    const resetPointer = () => { pointerPresence = 0; pointerTilt = 0; pointerLean = 0; pointerBounds = null; };
    const enterPointer = () => { if (profile.pointer) { pointerBounds = element.getBoundingClientRect(); pointerPresence = 1; } };
    const pointer = (event: PointerEvent) => {
      if (!profile.pointer || !inView || !pointerBounds || event.pointerType !== 'mouse') return;
      const x = (event.clientX - pointerBounds.left) / pointerBounds.width - 0.5;
      const y = (event.clientY - pointerBounds.top) / pointerBounds.height - 0.5;
      pointerTilt = Math.max(-0.018, Math.min(0.018, y * 0.035));
      pointerLean = Math.max(-0.012, Math.min(0.012, x * 0.025));
    };
    const visibility = () => { if (document.hidden) resetPointer(); governor.reset(); sync(); };
    try {
      // Allocate only the renderer we actually use. Construction can still fail despite API availability.
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.pixelRatios[quality()]));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // Keep albedo and emission in linear light, then convert once at output.
      // Avoid a second filmic/gamma transform of the geographic texture colors.
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setClearColor(0x000000, 0);
      renderer.debug.checkShaderErrors = true;
      renderer.debug.onShaderError = () => { shaderFailed = true; };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
      camera.position.z = 3.68;
      const group = new THREE.Group();
      group.rotation.x = baseTilt;
      scene.add(group);
      const globe = new THREE.Group();
      globe.rotation.y = -25 * Math.PI / 180;
      group.add(globe);
      const sun = new THREE.Vector3(-0.8, 0.45, 0.2).normalize();
      const loader = new THREE.TextureLoader();
      const texture = (url: string) => new Promise<THREE.Texture>((resolve, reject) => loader.load(url, t => {
        if (disposed || failed) { t.dispose(); reject(new Error('Earth no longer active')); return; }
        t.anisotropy = Math.min(renderer!.capabilities.getMaxAnisotropy(), profile.mobile ? 2 : 4);
        t.colorSpace = url.includes('day') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        textures.push(t);
        resolve(t);
      }, undefined, reject));
      const suffix = profile.lowTextures ? '-mobile' : '';
      Promise.all([texture(`/earth/day${suffix}.webp`), texture(`/earth/city-lights${suffix}.webp`), texture(`/earth/clouds${suffix}.webp`)]).then(([day, night, clouds]) => {
        if (disposed || failed) return;
        const geometry = new THREE.SphereGeometry(1, ...profile.segments); geometries.push(geometry);
        const surface = new THREE.ShaderMaterial({ vertexShader, fragmentShader: surfaceShader, uniforms: { dayMap: { value: day }, nightMap: { value: night }, cloudMap: { value: clouds }, integratedClouds: { value: 0 }, cloudShift: { value: 0 }, cityExposure: { value: profile.mobile ? 1.22 : 1.0 }, sunDirection: { value: sun } } });
        const cloudMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader: cloudsShader, transparent: true, depthWrite: false, uniforms: { cloudMap: { value: clouds }, sunDirection: { value: sun } } });
        const atmosphere = new THREE.ShaderMaterial({ vertexShader, fragmentShader: atmosphereShader, side: THREE.BackSide, transparent: true, depthWrite: false, uniforms: { sunDirection: { value: sun }, pointerPresence: { value: 0 } } });
        materials.push(surface, cloudMaterial, atmosphere);
        globe.add(new THREE.Mesh(geometry, surface));
        const cloudMesh = new THREE.Mesh(geometry, cloudMaterial); cloudMesh.scale.setScalar(1.008); globe.add(cloudMesh);
        const atmosphereMesh = new THREE.Mesh(geometry, atmosphere); atmosphereMesh.scale.setScalar(1.020); group.add(atmosphereMesh);
        const applyQuality = () => {
          renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.pixelRatios[quality()]));
          if (hasSize) renderer!.setSize(element.clientWidth, element.clientHeight, false);
          cloudMesh.visible = quality() < 2;
          surface.uniforms.integratedClouds.value = quality() === 2 ? 1 : 0;
          surface.uniforms.cityExposure.value = profile.mobile ? 1.22 : 1.0;
          element.dataset.earthProfile = profile.mobile ? 'mobile' : 'desktop';
          element.dataset.earthQuality = String(quality());
        };
        loop = createEarthRotationLoop({
          getTargetFps: () => EARTH_FRAME_TARGETS[quality()],
          requestFrame: callback => window.requestAnimationFrame(callback),
          cancelFrame: handle => window.cancelAnimationFrame(handle),
          onError: error => fail(error instanceof Error && ['shader','context','performance'].includes(error.message) ? error.message : 'frame'),
          onFrame: ({ angle, deltaSeconds, now, intervalMs }) => {
            globe.rotation.y = angle;
            const damping = 1 - Math.exp(-3.8 * deltaSeconds);
            group.rotation.x += (baseTilt + pointerTilt - group.rotation.x) * damping;
            group.rotation.z += (pointerLean - group.rotation.z) * damping;
            atmosphere.uniforms.pointerPresence.value += (pointerPresence - atmosphere.uniforms.pointerPresence.value) * damping;
            cloudMesh.rotation.y += deltaSeconds * (Math.PI * 2 / 210 - EARTH_ANGULAR_VELOCITY);
            surface.uniforms.cloudShift.value = -cloudMesh.rotation.y / (Math.PI * 2);
            const renderStart = performance.now();
            renderer!.render(scene, camera);
            if (shaderFailed || renderer!.getContext().isContextLost()) throw new Error(shaderFailed ? 'shader' : 'context');
            const decision = governor.sample(now, intervalMs, performance.now() - renderStart);
            if (decision === 'changed') applyQuality();
            else if (decision === 'fallback') throw new Error('performance');
            renderedFrames++;
            if (now - diagnosticTime >= 1000) {
              diagnosticTime = now;
              element.dataset.earthFrames = String(renderedFrames);
              element.dataset.earthAngle = globe.rotation.y.toFixed(6);
            }
            // Never hide the fallback merely because textures loaded or a canvas was appended.
            if (!shown) { shown = true; callbacks.current.onReady(); }
          },
        });
        const size = () => {
          if (disposed || failed) return;
          profile = chooseProfile();
          const width = element.clientWidth;
          const height = element.clientHeight;
          hasSize = width > 0 && height > 0;
          if (hasSize) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            applyQuality();
          }
          resetPointer();
          governor.reset();
          const pointerEvents = ['pointerenter', 'pointermove', 'pointerleave', 'pointercancel'] as const;
          const handlers = [enterPointer, pointer, resetPointer, resetPointer] as EventListener[];
          if (profile.pointer !== pointerAttached) {
            pointerEvents.forEach((name, index) => {
              if (profile.pointer) element.addEventListener(name, handlers[index], { passive: true });
              else element.removeEventListener(name, handlers[index]);
            });
            pointerAttached = profile.pointer;
          }
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
        window.addEventListener('resize', size, { passive: true });
        pointerMedia.addEventListener('change', size);
        wideMedia.addEventListener('change', size);
        device.connection?.addEventListener?.('change', size);
        cleanupResize = () => {
          window.removeEventListener('resize', size);
          pointerMedia.removeEventListener('change', size);
          wideMedia.removeEventListener('change', size);
          device.connection?.removeEventListener?.('change', size);
        };
        window.addEventListener('blur', resetPointer);
      }).catch(() => fail('texture'));
    } catch { fail('initialization'); }
    return () => {
      disposed = true;
      loop?.dispose();
      cleanupResize();
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
  return <div ref={host} className="earth-canvas" aria-hidden="true" />;
}
