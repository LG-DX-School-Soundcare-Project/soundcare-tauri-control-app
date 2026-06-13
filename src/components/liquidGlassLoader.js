// 3D liquid glass orb 로딩 컴포넌트 — Downloads/3d_liquid_glass_orb 기반
// (변경점: CDN import → 번들 three, Draco 압축 glb 지원, glb 1회 로드 후 인스턴스 공유)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { createDracoGltfLoader } from '../three/loaders.js';

// glb는 한 번만 다운로드/파싱하고 모든 인스턴스가 공유 (meshopt 압축 glb, draco도 지원)
let orbGltfCache = null;

function loadOrbGltf(src) {
  if (!orbGltfCache || orbGltfCache.src !== src) {
    const { loader } = createDracoGltfLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    orbGltfCache = { src, promise: loader.loadAsync(src) };
  }
  return orbGltfCache.promise;
}

class LiquidGlassLoader extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'background', 'transparent', 'flip'];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          width: 180px;
          height: 180px;
          contain: layout paint;
        }

        canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
      </style>
      <canvas></canvas>
    `;

    this.canvas = this.shadowRoot.querySelector('canvas');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.root = null;
    this.mixer = null;
    this.clock = new THREE.Clock();
    this.resizeObserver = null;
    this.modelRadius = 1;
  }

  connectedCallback() {
    this.init();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    this.renderer?.setAnimationLoop(null);
    this.renderer?.dispose();
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.root = null;
    this.mixer = null;
  }

  attributeChangedCallback(name) {
    if (!this.renderer) return;

    if (name === 'src') {
      this.loadModel();
      return;
    }

    this.applyBackground();
  }

  get modelSrc() {
    return this.getAttribute('src') || '/assets/loading/liquid_glass.glb';
  }

  get backgroundColor() {
    return this.getAttribute('background') || '#ffffff';
  }

  get baseRotationY() {
    return this.hasAttribute('flip') ? Math.PI : 0;
  }

  init() {
    if (this.renderer) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: this.hasAttribute('transparent'),
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(this.renderer),
      0.04
    ).texture;
    pmremGenerator.dispose();

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.applyBackground();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this);

    this.loadModel();
    this.renderer.setAnimationLoop(() => this.animate());
  }

  applyBackground() {
    if (!this.renderer || !this.scene) return;

    if (this.hasAttribute('transparent')) {
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0);
      return;
    }

    const color = new THREE.Color(this.backgroundColor);
    this.scene.background = color;
    this.renderer.setClearColor(color, 1);
  }

  isSpinnerMesh(name) {
    return name === 'SpinnerBlob' || name.startsWith('SpinnerDrop');
  }

  isSpinnerDropMesh(name) {
    return name.startsWith('SpinnerDrop');
  }

  getSourceColor(material, fallback) {
    return material?.color?.clone?.() || fallback.clone();
  }

  getMaterial(mesh) {
    return Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  }

  getMergedDropColor(model) {
    const color = new THREE.Color(0, 0, 0);
    let count = 0;

    model.traverse((child) => {
      if (!child.isMesh || !this.isSpinnerDropMesh(child.name)) return;

      color.add(this.getSourceColor(this.getMaterial(child), new THREE.Color(0xedf1f7)));
      count += 1;
    });

    return count > 0
      ? color.multiplyScalar(1 / count)
      : new THREE.Color(0xedf1f7);
  }

  createLiquidGelMaterial(sourceMaterial, overrideColor = null) {
    const color =
      overrideColor?.clone() ||
      this.getSourceColor(sourceMaterial, new THREE.Color(0xedf1f7));

    return new THREE.MeshPhysicalMaterial({
      name: `Runtime_${sourceMaterial?.name || 'LiquidGel'}`,
      color,
      metalness: 0,
      roughness: 0.38,
      transmission: 0,
      thickness: 0,
      ior: 1.36,
      clearcoat: 0.35,
      clearcoatRoughness: 0.28,
      attenuationColor: color.clone(),
      attenuationDistance: 0.4,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true
    });
  }

  createOrbMaterial() {
    return new THREE.MeshPhysicalMaterial({
      name: 'Runtime_LiquidGlassOrb',
      color: new THREE.Color(0xffffff),
      metalness: 0,
      roughness: 0.05,
      transmission: 1,
      thickness: 0.18,
      ior: 1.12,
      specularIntensity: 1,
      attenuationColor: new THREE.Color(0xf8fbff),
      attenuationDistance: 24,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.65,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      depthTest: true
    });
  }

  replaceMaterial(mesh, mergedDropColor) {
    if (mesh.name === 'LiquidGlassOrb_Mesh') {
      mesh.material = this.createOrbMaterial();
      mesh.renderOrder = 2;
      return;
    }

    if (this.isSpinnerMesh(mesh.name)) {
      const sourceMaterial = this.getMaterial(mesh);
      const overrideColor =
        mesh.name === 'SpinnerBlob' ? mergedDropColor : null;

      mesh.material = this.createLiquidGelMaterial(sourceMaterial, overrideColor);
      mesh.renderOrder = 3;
    }
  }

  normalizeModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const sphere = box.getBoundingSphere(new THREE.Sphere());

    model.position.sub(sphere.center);
    model.rotation.y = this.baseRotationY;
    this.modelRadius = Math.max(sphere.radius, 0.001);
  }

  frameCamera() {
    if (!this.camera || !this.renderer) return;

    const rect = this.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const pixelRatio = Math.min(window.devicePixelRatio, 2);

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);

    this.camera.aspect = width / height;

    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov =
      2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const limitingFov = Math.min(verticalFov, horizontalFov);
    const distance = this.modelRadius / Math.sin(limitingFov / 2);

    this.camera.position.set(
      this.modelRadius * 0.08,
      this.modelRadius * 0.44,
      distance * 0.95
    );
    this.camera.near = Math.max(distance / 100, 0.01);
    this.camera.far = distance * 100;
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  resize() {
    this.frameCamera();
  }

  playAnimation(gltf, model) {
    this.mixer = null;

    if (gltf.animations.length === 0) return;

    this.mixer = new THREE.AnimationMixer(model);

    const spinnerLoop = THREE.AnimationClip.findByName(
      gltf.animations,
      'SpinnerLoop'
    );
    const clips = spinnerLoop ? [spinnerLoop] : gltf.animations;

    clips.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      action.enabled = true;
      action.play();
    });
  }

  loadModel() {
    this.root.clear();
    this.mixer = null;

    loadOrbGltf(this.modelSrc).then(
      (gltf) => {
        if (!this.root) return; // 이미 해제된 인스턴스

        // 공유 gltf에서 인스턴스별 사본 생성 (지오메트리 공유, 머티리얼은 아래에서 교체)
        const model = gltf.scene.clone(true);
        const mergedDropColor = this.getMergedDropColor(model);

        model.traverse((child) => {
          if (!child.isMesh) return;

          child.frustumCulled = false;
          this.replaceMaterial(child, mergedDropColor);
        });

        this.normalizeModel(model);
        this.root.add(model);
        this.playAnimation(gltf, model);
        this.frameCamera();

        // 모델이 실제로 표시되는 시점 알림 (파동 시작 등 외부 연출용)
        this.dispatchEvent(new CustomEvent('loader-ready', { bubbles: true }));
      },
      (error) => {
        this.dispatchEvent(
          new CustomEvent('loader-error', {
            bubbles: true,
            detail: error
          })
        );
      }
    );
  }

  animate() {
    const delta = this.clock.getDelta();

    if (this.mixer) {
      this.mixer.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

if (!customElements.get('liquid-glass-loader')) {
  customElements.define('liquid-glass-loader', LiquidGlassLoader);
}
