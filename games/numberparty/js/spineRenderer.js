// Spine canvas renderer for GOL block objects.
// Requires @esotericsoftware/spine-canvas loaded globally (window.spine).
// Call load(basePath) once before any createBlock() calls.

const CANVAS_CSS  = 120;
const SPINE_UNITS = 202;
const BLOCK_CSS   = 58;

const _instances    = new Map();
const _skeletonData = {};
let   _atlas    = null;
let   _raf      = null;
let   _lastTime = 0;
let   _nextId   = 0;

// ── Public API ───────────────────────────────────────────────────────────────

export async function load(basePath = 'spine') {
  const imageNames = [
    'VisualTypes.png',
    'VisualTypes_2.png', 'VisualTypes_3.png', 'VisualTypes_4.png',
    'VisualTypes_5.png', 'VisualTypes_6.png', 'VisualTypes_7.png',
  ];

  const images = {};
  await Promise.all(imageNames.map(name => new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => { images[name] = img; res(); };
    img.onerror = () => rej(new Error(`Failed to load ${basePath}/${name}`));
    img.src = `${basePath}/${name}`;
  })));

  const atlasText = await fetch(`${basePath}/VisualTypes.atlas`).then(r => r.text());
  _atlas = new spine.TextureAtlas(atlasText, path => {
    if (!images[path]) throw new Error(`Spine atlas references unknown texture: ${path}`);
    return new spine.CanvasTexture(images[path]);
  });
  // spine-canvas 4.2 IIFE doesn't store the loader return value on page.texture —
  // set page textures manually, then propagate to each region.
  for (const page of _atlas.pages) {
    if (!page.texture) page.texture = new spine.CanvasTexture(images[page.name]);
    for (const region of page.regions) region.texture = page.texture;
  }

  const attachLoader = new spine.AtlasAttachmentLoader(_atlas);
  const jsonParser   = new spine.SkeletonJson(attachLoader);

  await Promise.all(Array.from({ length: 13 }, (_, i) => {
    const file = i.toString().padStart(2, '0');
    return fetch(`${basePath}/${file}.json`)
      .then(r => r.json())
      .then(data => { _skeletonData[i] = jsonParser.readSkeletonData(data); });
  }));

  _startLoop();
}

export function createBlock(number, skinName) {
  const dpr   = Math.min(window.devicePixelRatio || 1, 2);
  const phys  = CANVAS_CSS * dpr;
  const scale = (BLOCK_CSS / SPINE_UNITS) * dpr;

  const canvas  = document.createElement('canvas');
  canvas.width  = phys;
  canvas.height = phys;
  Object.assign(canvas.style, {
    position: 'absolute',
    width:  `${CANVAS_CSS}px`,
    height: `${CANVAS_CSS}px`,
    top:    '50%',
    left:   '50%',
    transform: 'translate(-50%,-50%)',
    pointerEvents: 'none',
  });

  const ctx    = canvas.getContext('2d');
  const skData = _skeletonData[number];
  if (!skData) {
    console.error('[spine] no skeletonData for index', number);
    return canvas;
  }

  const skeleton  = new spine.Skeleton(skData);
  skeleton.setSkinByName(skinName);
  skeleton.setToSetupPose();
  skeleton.scaleX = scale;
  skeleton.scaleY = scale;

  const stateData = new spine.AnimationStateData(skData);
  const animState = new spine.AnimationState(stateData);
  animState.setAnimation(0, 'idle', true);   // loop so it never expires

  const id = _nextId++;
  _instances.set(id, { canvas, ctx, skeleton, animState, phys, _firstFrame: true });
  canvas._spineId = id;
  return canvas;
}

export function playAnim(canvas, animName, loop = false) {
  const inst = _instances.get(canvas?._spineId);
  if (inst) inst.animState.setAnimation(0, animName, loop);
}

export function playIncorrect(canvas) {
  const inst = _instances.get(canvas?._spineId);
  if (!inst) return;
  inst.animState.setAnimation(0, 'incorrect', false);
  inst.animState.addAnimation(0, 'active', true, 0);
}

export function destroyBlock(canvas) {
  const id = canvas?._spineId;
  if (id !== undefined) {
    _instances.delete(id);
    delete canvas._spineId;
  }
}

export function destroyAll(rootEl) {
  rootEl.querySelectorAll('canvas').forEach(c => destroyBlock(c));
}

// ── Render loop ──────────────────────────────────────────────────────────────

function _startLoop() {
  if (_raf !== null) return;
  _lastTime = performance.now();
  _raf = requestAnimationFrame(_loop);
}

function _loop(now) {
  const dt = Math.min((now - _lastTime) / 1000, 0.064);
  _lastTime = now;

  for (const [, inst] of _instances) {
    const { ctx, skeleton, animState, phys } = inst;

    animState.update(dt);
    animState.apply(skeleton);
    if (typeof skeleton.update === 'function') skeleton.update(dt);
    skeleton.updateWorldTransform(spine.Physics.update);

    ctx.clearRect(0, 0, phys, phys);
    ctx.save();
    ctx.translate(phys / 2, phys / 2);
    ctx.scale(1, -1);
    _drawSkeleton(ctx, skeleton, inst);
    ctx.restore();
  }

  _raf = requestAnimationFrame(_loop);
}

// Direct region-attachment renderer — bypasses spine.SkeletonRenderer to
// avoid any class-reference or version-mismatch issues with instanceof checks.
function _drawSkeleton(ctx, skeleton, inst) {
  const drawOrder = skeleton.drawOrder;
  for (let i = 0; i < drawOrder.length; i++) {
    const slot = drawOrder[i];
    if (!slot.bone.active) continue;

    const att = slot.getAttachment();
    // Region attachments carry a 'region' property set by AtlasAttachmentLoader
    if (!att || !att.region) continue;

    const region = att.region;
    const img    = region.texture && region.texture.getImage
                   ? region.texture.getImage()
                   : null;
    if (!img) continue;

    // On the very first frame, log what we're about to draw so console shows the chain
    if (inst._firstFrame) {
      console.log('[spine] drawing slot', slot.data.name,
                  'att', att.name || '?',
                  'region', region.name || '?',
                  'img', img.src ? img.src.split('/').pop() : '?',
                  'natural', img.naturalWidth + 'x' + img.naturalHeight,
                  'bone active', slot.bone.active,
                  'alpha', skeleton.color.a * slot.color.a * att.color.a);
    }

    const alpha = skeleton.color.a * slot.color.a * att.color.a;
    if (alpha <= 0) continue;

    const w  = region.width;
    const h  = region.height;
    const sx = Math.round((img.naturalWidth  || img.width)  * region.u);
    const sy = Math.round((img.naturalHeight || img.height) * region.v);

    const bone = slot.bone;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.transform(bone.a, bone.c, bone.b, bone.d, bone.worldX, bone.worldY);
    ctx.translate(att.offset[0], att.offset[1]);
    ctx.rotate(att.rotation * Math.PI / 180);
    const as_ = att.width / region.originalWidth;
    ctx.scale(as_ * att.scaleX, as_ * att.scaleY);
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, -1);
    ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
    ctx.restore();
  }

  if (inst._firstFrame) {
    inst._firstFrame = false;
  }
}
