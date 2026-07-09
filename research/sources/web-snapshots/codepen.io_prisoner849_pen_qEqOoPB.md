# CodePen: Sacred Pearl (prisoner849)

Source: https://codepen.io/prisoner849/pen/qEqOoPB
Recovered via the pen's embedded init-data JSON (CodePen blocks plain curl with 403; a browser User-Agent succeeded). Full unminified JS + HTML(head) tabs below, verbatim from the pen editor state.

Tags (author-assigned): threejs, fatlines, meshsurfacesampler, instancing

## HTML tab (importmap + inline shader string constants)

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.184.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.184.0/examples/jsm/"
    }
  }
</script>
<script>
  const fbm = `
  #define NUM_OCTAVES 5

float fbm(vec3 x) {
	float v = 0.0;
	float a = 0.5;
	vec3 shift = vec3(100);
	for (int i = 0; i < NUM_OCTAVES; ++i) {
		v += a * snoise(x);
		x = x * 2.0 + shift;
		a *= 0.5;
	}
	return v;
}
  `;
  const noise3d = `
    //	Simplex 3D Noise 
//	by Ian McEwan, Stefan Gustavson (https://github.com/stegu/webgl-noise)
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}
  `;
  
  const noise4d = `//	Simplex 4D Noise 
//	by Ian McEwan, Stefan Gustavson (https://github.com/stegu/webgl-noise)
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}

vec4 grad4(float j, vec4 ip){
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

  return p;
}

float snoise(vec4 v){
  const vec2  C = vec2( 0.138196601125010504,  // (5 - sqrt(5))/20  G4
                        0.309016994374947451); // (sqrt(5) - 1)/4   F4
// First corner
  vec4 i  = floor(v + dot(v, C.yyyy) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

// Other corners

// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;

  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
//  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;

//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;

  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  //  x0 = x0 - 0.0 + 0.0 * C 
  vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
  vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
  vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
  vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;

// Permutations
  i = mod(i, 289.0); 
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
// Gradients
// ( 7*7*6 points uniformly over a cube, mapped onto a 4-octahedron.)
// 7*7*6 = 294, which is close to the ring size 17*17 = 289.

  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

// Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));

// Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;

}
`;
</script>
<div class="text no-selection">Sacred Pearl</div>
```

## JS tab (full source)

```js
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as BGU from "three/addons/utils/BufferGeometryUtils.js"; 

import { SimplexNoise } from "three/addons/math/SimplexNoise.js";

import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';

import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';

console.clear();

const simplex = new SimplexNoise();
const goldenAngle = 2.39996322972865332;
const du = THREE.DataUtils;
const gu = {
  time: { value: 0 },
  timeDelta: { value: 0 }
};

class Postprocessing extends EffectComposer{
  constructor(renderer, scene, camera){
    super(renderer);
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    const renderPass = new RenderPass( scene, camera );
    this.addPass( renderPass );

    const outputPass = new OutputPass();
    this.addPass( outputPass );
    
    const fxaaPass = new FXAAPass();
    this.addPass( fxaaPass );
    
  }
}

class Vapourizing extends THREE.Points{
  constructor(amount = 5000){
    
    const baseCurveData = new THREE.Path()
      .moveTo(1, 0)
      .bezierCurveTo(1.5, 1, 0.25, 1, 0.05, 3)
      .getSpacedPoints(1024).map(p => [
        du.toHalfFloat(p.x), 
        du.toHalfFloat(p.y - 0.5), 
        du.toHalfFloat(0), 
        du.toHalfFloat(0)
      ]).flat();
    //console.log(baseCurveData);
    const baseCurveTexture = new THREE.DataTexture(new Uint16Array(baseCurveData), 1024, 1, THREE.RGBAFormat, THREE.HalfFloatType);
    baseCurveTexture.wrapS = THREE.RepeatWrapping;
    baseCurveTexture.minFilter = baseCurveTexture.magFilter = THREE.LinearFilter;
    baseCurveTexture.needsUpdate = true;
    
    const inits = []; // u, v, phase
    const g = new THREE.BufferGeometry().setFromPoints(Array.from({length: amount}, () => {
      inits.push(Math.random(), Math.random(), Math.random());
      return new THREE.Vector3();
    }));
    g.setAttribute("inits", new THREE.Float32BufferAttribute(inits, 3));
    
    const m = new THREE.PointsMaterial({
      size: 0.025,
      transparent: true,
      color: new THREE.Color(1, 0.75, 0.25),
      depthWrite: false,
      onBeforeCompile: shader => {
        shader.uniforms.time = gu.time;
        shader.uniforms.curveTexture = {value: baseCurveTexture};
        shader.vertexShader = `
          uniform float time;
          uniform sampler2D curveTexture;
          
          attribute vec3 inits;
          
          varying float vOpacity;
          varying float vBlur;
          
          ${noise3d}
          
          ${shader.vertexShader}
        `.replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>
          
          float currentU = fract(inits.x + time * 0.1 * (inits.z * 0.9 + 0.1));
          vec4 curveData = texture(curveTexture, vec2(currentU, 0.5));
          
          float r = curveData.x + inits.z * 0.2 * curveData.y;
          float a = inits.y * PI2;
          
          float x = cos(a);
          float y = curveData.y;
          float z = sin(a);
          
          float n = snoise(vec3(vec2(x, z) * r, (y * 0.25 - time * 0.1)));
          n = (pow(abs(n), 0.75) * 0.25) * sign(n);
          float sway = smoothstep(0., 0.5, currentU);
          a += PI * 0.5 * n * sway;
          x = cos(a) * r;
          z = sin(a) * r;
          
          transformed = vec3(x, y, z);
          
          float of = 1. - sqrt(1. - (inits.z - 1.) * inits.z); // opacity fade
          vOpacity = smoothstep(0., 0.25, currentU) - smoothstep(0.5, 1. - of * 0.25, currentU);
          vBlur = smoothstep(0.25, 1., currentU);
          `
        ).replace(
          `gl_PointSize = size;`,
          `
          gl_PointSize = size * (1. + 3. * smoothstep(0., 1., currentU));
          `
        );
        shader.fragmentShader = `
          uniform float time;
          
          varying float vOpacity;
          varying float vBlur;
          
          ${shader.fragmentShader}
        `.replace(
          `vec4 diffuseColor = vec4( diffuse, opacity );`,
          `
          float dist = length(gl_PointCoord.xy - 0.5);
          if (dist > 0.5) discard;
          float fOpacity = 1. - smoothstep(0.25 - (0.25 * vBlur), 0.5, dist);
          vec4 diffuseColor = vec4( diffuse, opacity * vOpacity * fOpacity);
          `
        );
        //console.log(shader.vertexShader)
      }
    })
    super(g, m);
  }
}

class PetalLines{
  constructor(){
    this.points = [];
    this.widths = [];
    const desiredWidth = 2;
    const desiredHeight = 2;
    const curvesAmount = 30;
    const curvePointsAmount = 10;
    
    const ratioWidth = desiredWidth / curvesAmount;
    const ratioHeight = desiredHeight / curvePointsAmount;
    
    const curves = Array.from({length: curvesAmount}, (_, curveIdx) => {
      
      const peripheralRatio = 1. - (Math.abs((curveIdx / (curvesAmount - 1)) - 0.5) / 0.5);
      const baseX = -(curvesAmount - 1) * 0.5 + curveIdx;
      
      const curve = new THREE.CatmullRomCurve3(
        Array.from({length: curvePointsAmount}, (_, pointIdx) => {
          return new THREE.Vector3(
            (baseX + (Math.random() - 0.5) * 3),
            pointIdx,
            0
          )
        })
      );
      
      const circularF = (val) => {return 1. - Math.sqrt(1 - --val * val)};
      const points = [];
      const pointsMaxValue = 100;
      const pointsMax = pointsMaxValue - Math.floor((pointsMaxValue * 0.75) * circularF(peripheralRatio));
      for(let i = 0; i < pointsMax; i++){
        points.push(curve.getPointAt(i / (pointsMaxValue - 1)));
      }
      for(let i = 0; i < pointsMax - 1; i++){
        const widthVal = ((i / (pointsMax - 2)) ** 16) * 0.5 + 0.5;
        this.widths.push(widthVal);
      }
      
      //console.log(this.widths);
      
      points.forEach(p => {
        
        p.x *= ratioWidth;
        p.y *= ratioHeight;
        
        if (p.y <= desiredHeight * 0.5) {
          const f = THREE.MathUtils.smoothstep(p.y, 0, desiredHeight * 0.5);
          p.x *= f;
        }
        p.z += Math.pow(THREE.MathUtils.smoothstep(p.y, 0, desiredHeight), 4);
        
        // concavity
        const concavityR = 2.;
        const concavityVal = concavityR - Math.sqrt((concavityR ** 2) - (p.x ** 2));
        //console.log(concavityVal);
        p.z += concavityVal;
      });
      
      // make it double
      const finalPoints = points.map((p, pIdx) => {
        const retVal = [p.clone()];
        if (pIdx != 0 && pIdx != (points.length - 1)){retVal.push(p.clone())};
        return retVal;
      }).flat();
      
      this.points.push(...finalPoints);
    })
  }
}

class Petals extends THREE.Group{
  constructor(amount = 9){
    super();
    
    const gPetals = BGU.mergeGeometries(Array.from({length: amount}, (_, petalIdx) => {
      const petalRatio = petalIdx / (amount - 1);
      const scale = 1. - 0.25 * petalRatio;
      const petalsData = new PetalLines()
      const gPetal = new THREE.BufferGeometry()
      .setFromPoints(petalsData.points)
      .scale(scale, scale, scale)
      .rotateX(Math.PI * -0.5 + Math.PI * 0.1 * petalRatio)
      .translate(0, 0, -petalRatio * 0.2)
      .rotateY(goldenAngle * petalIdx);
      
      gPetal.setAttribute("widths", new THREE.Float32BufferAttribute(petalsData.widths, 1));
      
      return gPetal;
    })).translate(0, -0.9, 0);
    
    const lineSegments = new THREE.LineSegments(gPetals);
    
    const gFatSegments = new LineSegmentsGeometry().fromLineSegments(lineSegments);
    gFatSegments.setAttribute(
      "widths", 
      new THREE.InstancedBufferAttribute(
        gPetals.attributes.widths.array,
        1
      )
    );
    const mFatSegmetns = new LineMaterial({
      color: new THREE.Color(1, 0.375, 0),
      //alphaToCoverage: true,
      worldUnits: true, 
      linewidth: 0.0375,
      onBeforeCompile: shader => {
        shader.uniforms.time = gu.time;
        shader.uniforms.noiseTexture = {value: (() => {
          const v = new THREE.Vector4();
          const size = 32;
          const data = Array.from(
            {length: size ** 3}, 
            () => {
              v.random().subScalar(0.5).multiplyScalar(2);
              return [
                du.toHalfFloat(v.x),
                du.toHalfFloat(v.y),
                du.toHalfFloat(v.z),
                du.toHalfFloat(v.w)
              ]
            }
          ).flat();
          //console.log(data);
          const dataTexture = new THREE.Data3DTexture(new Uint16Array(data), size, size, size);
          dataTexture.format = THREE.RGBAFormat;
          dataTexture.type = THREE.HalfFloatType;
          dataTexture.minFilter = dataTexture.magFilter = THREE.LinearFilter;
          dataTexture.wrapR = dataTexture.wrapS = dataTexture.wrapT = THREE.RepeatWrapping;
          dataTexture.needsUpdate = true;
          return dataTexture;
        })()}
        shader.vertexShader = `
          uniform float time;
          uniform sampler3D noiseTexture;
          attribute float widths;
          varying float vWidths;
          varying vec2 vUv;
          ${shader.vertexShader}
        `.replace(
          `float hw = linewidth * 0.5;`,
          `float hw = linewidth * widths * 0.5;
          vWidths = widths;
          vUv = uv;
          `
        ).replace(
          `vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );`,
          `
          float t = -time * 0.01;
          vec3 startUV = instanceStart * 0.1 + vec3(0.5, t, 0.5);
          vec3 endUV = instanceEnd * 0.1 + vec3(0.5, t, 0.5);
          
          vec4 startData = texture(noiseTexture, startUV);
          vec4 endData = texture(noiseTexture, endUV);
          
          float noiseRatio = (widths - 0.5) * 2.;
          vec3 startShift = startData.xyz * noiseRatio * 0.05;
          vec3 endShift = endData.xyz * noiseRatio * 0.05;
          
          vec4 start = modelViewMatrix * vec4( instanceStart + startShift, 1.0 );
			    vec4 end = modelViewMatrix * vec4( instanceEnd + endShift, 1.0 );
          `
        );
        shader.fragmentShader = `
          varying float vWidths;
          varying vec2 vUv;
          ${shader.fragmentShader}
        `.replace(
          `float norm = len / linewidth;`,
          `float norm = len / (linewidth * vWidths);`
        ).replace(
          `vec4 diffuseColor = vec4( diffuse, alpha );`,
          `
          vec3 brightCol = vec3(1, 0.75, 0.25);
          float fw = length(fwidth(vUv));
          vec3 col = mix(diffuse, brightCol, 1. - smoothstep(0., fw, abs(vUv.x)));
          col = mix(col, brightCol, smoothstep(0.95, 1., vWidths));
          vec4 diffuseColor = vec4( col, alpha );
          `
        );
        //console.log(shader.vertexShader);
      }
    });
    const fatSegments = new LineSegments2(gFatSegments, mFatSegmetns);
    
    this.add(
      fatSegments
    )
    
  }
}

class Vegetation extends THREE.Group{
  constructor(hut){
    super();
    // roots
    {
      const rootsAmount = 15;
      const aStep = (Math.PI * 2) / rootsAmount;
      const axis = new THREE.Vector3(0, 1, 0);
      const gRoots = Array.from({length: rootsAmount}, (_, rootIdx) => {
        let aBase = goldenAngle * rootIdx ;
        const vBase = new THREE.Vector3(1, 0, 0).applyAxisAngle(axis, aBase);
        let lBase = (Math.random() * 0.5 + 0.5) * 0.5;
        const curve = new THREE.CatmullRomCurve3(
          [
            new THREE.Vector3(),
            ...Array.from({length:Math.floor(Math.random() * 5) + 5}, () => {
              aBase += (Math.random() - 0.5) * aStep;
              const v = new THREE.Vector3(1, 0, 0).applyAxisAngle(axis, aBase).setLength(lBase);
              lBase += (Math.random() * 0.5 + 0.5) * 0.25;
              return v;
            })
          ].map(v => v.setY(-1))
        )
        const segs = 150;
        const rads = 11;
        const gTube = new THREE.TubeGeometry(curve, segs, 1, rads);
        const pos = gTube.attributes.position;
        const nor = gTube.attributes.normal;
        const uvs = gTube.attributes.uv;
        const p = new THREE.Vector3();
        const n = new THREE.Vector3();
        const u = new THREE.Vector2();
        for(let i = 0; i <= segs; i++){
          for(let j = 0; j <= rads; j++){
            const pIdx = (rads + 1) * i + j;
            p.fromBufferAttribute(pos, pIdx);
            n.fromBufferAttribute(nor, pIdx);
            u.fromBufferAttribute(uvs, pIdx);
            let uVal = 1. - u.x;
            const uF = Math.sqrt(1 - --uVal * uVal);
            const multiplier = 0.5;
            const nF = simplex.noise3d(p.x * multiplier, p.y * multiplier, p.z * multiplier) * 0.01;
            const shift = 0.05 * (uF + nF);
            p.addScaledVector(n, -1).addScaledVector(n, shift);
            p.y += shift;
            pos.setXYZ(pIdx, ...p);
          }

        }
        return gTube;
      })
      const mRoots = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1, 0.375, 0),
        onBeforeCompile: shader => {
          shader.vertexShader = `
            varying vec3 vNor;
            varying vec3 mvPos;
            ${shader.vertexShader}
          `.replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>
              vNor = normalMatrix * normal;
              mvPos = -vec3(modelViewMatrix * vec4(position, 1.));
            `
          );
          shader.fragmentShader = `
            varying vec3 vNor;
            varying vec3 mvPos;
            ${shader.fragmentShader}
          `.replace(
            `#include <color_fragment>`,
            `#include <color_fragment>

            vec3 col = diffuseColor.rgb;
            float colF = smoothstep(0., 0.5, abs(vUv.y - 0.5));
            colF = max(colF, 1. - smoothstep(0.2, 0.5, vUv.x));

            float cbF = smoothstep(0.5, 1., dot(normalize(vNor), normalize(mvPos)));
            col = mix(col, col + 0.1, cbF);

            diffuseColor.rgb = mix(diffuseColor.rgb * 0.75, col, colF);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1, 0.75, 0.25), smoothstep(0.75, 1., vUv.x));
            `
          );
        }
      });
      mRoots.defines = {"USE_UV": ""}

      const roots = new THREE.Mesh(BGU.mergeGeometries(gRoots), mRoots);

      this.add(roots);
    }
    
    // floral things
    {
      const sampler = new MeshSurfaceSampler( hut ).build();
      const floralPointsAmount = 5000;

      const gFloral = BGU.mergeGeometries(Array.from({length: 5}, (_, gIdx) => {
        const g = new THREE.PlaneGeometry(2, 1, 1, 20).translate(0, 0.5, 0).rotateX(Math.PI * 0.5);
        g.setAttribute("geometryID", new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(gIdx), 1));
        return g;
      }));
      const mFloral = new THREE.MeshLambertMaterial({
        side: THREE.DoubleSide,
        forceSinglePass: true,
        onBeforeCompile: shader => {
          shader.uniforms.time = gu.time;
          shader.uniforms.petalCurve = {value: (() => {
            const curvePointsData = new THREE.Path()
              .moveTo(0, 0)
              .bezierCurveTo(1, 0, -0.5, 1, 1.5, 1)
              .getSpacedPoints(256)
              .map(p => [
                du.toHalfFloat(p.x),
                du.toHalfFloat(p.y),
                du.toHalfFloat(0), 
                du.toHalfFloat(0)
              ])
              .flat();
            const curveTexture = new THREE.DataTexture(new Uint16Array(curvePointsData), 256, 1, THREE.RGBAFormat, THREE.HalfFloatType);
            curveTexture.minFilter = curveTexture.magFilter = THREE.LinearFilter;
            curveTexture.needsUpdate = true;
            return curveTexture;
          })()};
          shader.vertexShader = `
            uniform float time;
            uniform sampler2D petalCurve;
            attribute float geometryID;
            attribute vec4 floralRot;
            
            varying float vDist;
            
            mat2 rot(float a){return mat2(cos(a), -sin(a), sin(a), cos(a));}
            float circular(float val){return 1. - sqrt(clamp(1. - val * val, 0., 1.));}
            
            ${noise4d}
            ${shader.vertexShader}
          `.replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>
            
              vec3 pos = position;
              
              vec3 instPos = instanceMatrix[3].xyz;
              vDist = length(instPos);
              float growthRatio = snoise(vec4(instPos * 2., time * 0.1));
              growthRatio = clamp(growthRatio, 0., 1.);
              growthRatio = growthRatio * 0.85 + 0.15;
              
              
              float localGrowthRatio = uv.y * growthRatio;
              
              vec4 petalCurveData = texture(petalCurve, vec2(localGrowthRatio, 0.5));
              
              pos.x *= smoothstep(0., 0.5, uv.y) - circular(clamp((uv.y - 0.5), 0., 0.5) / 0.5);
              pos.x *= localGrowthRatio;
              pos.y = petalCurveData.y * 1.5;
              pos.z = petalCurveData.x;
              
              pos.xy *= rot((geometryID * (2. / 5.) + floralRot.x) * PI);
              
              transformed = pos;
              
            `
          );
          shader.fragmentShader = `
            varying float vDist;
            ${shader.fragmentShader}
          `.replace(
            `#include <opaque_fragment>`,
            `
            #include <opaque_fragment>
            
            vec3 mainCol = gl_FragColor.rgb;
            
            vec3 baseCol = mix(vec3(0.75, 0.2, 0), vec3(1, 0.375, 0), smoothstep(0., 0.5, abs(vUv.y - 0.5)));
            baseCol = mix(baseCol, vec3(0.5, 0.1, 0), sin(abs(vUv.x - 0.5) * PI2 * 2.)); // stripes
            vec3 col = mix(gl_FragColor.rgb, baseCol, smoothstep(0.5, 1., vUv.y));
            
            gl_FragColor.rgb = gl_FrontFacing ? baseCol : col;
            gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.875, mainCol, smoothstep(1.5, 2.75, vDist));
            `
          );
        }
      });
      mFloral.defines = {"USE_UV": ""};
      const florals = new THREE.InstancedMesh(gFloral, mFloral, floralPointsAmount);

      const floralPos = new THREE.Vector3();
      const floralNor = new THREE.Vector3();
      const floralDummy = new THREE.Object3D();
      const floralInints = new THREE.Vector4();
      const floralRot = [];
      for(let i = 0; i < floralPointsAmount; i++){
        sampler.sample(floralPos, floralNor);
        const posLen = floralPos.length();
        if(posLen > 2.75 || posLen < 1.5){
          i--;
        } else {
          floralRot.push(...floralInints.random().subScalar(0.5).multiplyScalar(2));
          floralDummy.position.copy(floralPos);
          floralDummy.lookAt(...floralPos.clone().addScaledVector(floralNor, -1));
          floralDummy.scale.setScalar(((Math.random() * 0.5 + 0.5) ** 1) * 0.1);
          floralDummy.updateMatrix();
          florals.setMatrixAt(i, floralDummy.matrix);
        }
      }
      
      gFloral.setAttribute("floralRot", new THREE.InstancedBufferAttribute(new Float32Array(floralRot), 4));
      
      this.add(florals);
    }
    
  }
}

class Central extends THREE.Mesh {
  constructor() {
    super(
      new THREE.SphereGeometry(0.75, 64, 32),
      new THREE.MeshBasicMaterial({
        color: "#000",
        onBeforeCompile: (shader) => {
          shader.uniforms.time = gu.time;
          shader.vertexShader = `
            varying vec3 vPos;
            varying vec3 mvPos;
            varying vec3 vNor;
            ${shader.vertexShader}
          `.replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>
              vPos = position;
              mvPos = -vec3(modelViewMatrix * vec4(position, 1.));
              vNor = normalMatrix * normal;
            `
          );
          shader.fragmentShader = `
            uniform float time;
            varying vec3 vPos;
            varying vec3 mvPos;
            varying vec3 vNor;
            ${noise3d}
            ${fbm}
            ${shader.fragmentShader}
          `.replace(
            `#include <color_fragment>`,
            `#include <color_fragment>
            
            vec3 baseCol = vec3(1., 0.375, 0.);

            vec3 col = vec3(0);
            float fDot = dot(normalize(mvPos), normalize(vNor));
            
            // noise pattern
            float pNoise = fbm(vPos * 0.5 - vec3(0., time * 0.05, 0.));
            pNoise = 1. - pow(abs(pNoise), 0.5);
            pNoise = smoothstep(0., 0.95, pNoise);
            pNoise = pow(pNoise, 4.);
            float fPattern = pNoise * smoothstep(0., 0.4, fDot);
            col = mix(col, vec3(1, 0.75, 0), fPattern);
            
            // halo
            float haloF = smoothstep(-0.25, 0.4, fDot) - smoothstep(0.4, 0.95, fDot);
            haloF = pow(haloF, 2.);
            
            col = mix(
              col, 
              mix(baseCol, vec3(1, 0.75, 0), pow(smoothstep(0.5, 1., haloF), 2.)), 
              haloF
            ); // soft inner halo
            
            float fN = snoise(vec3(vPos.xz * 3., time * 0.5)) * 0.1;
            
            // orange bottom
            float colF = 1. - smoothstep(-0.7 + fN, 0.75, vPos.y);
            colF = pow(colF, 0.75);
            colF = 0.1 + colF * 0.9;
            col = mix(col, baseCol, colF); // more color at the bottom
            
            diffuseColor.rgb = col;
            
            `
          );
        }
      })
    );
    this.material.defines = { USE_UV: "" };
    this.position.y = -0.2;
    
    
  }
}

class Hut extends THREE.Mesh {
  constructor() {
    const g = new THREE.CylinderGeometry(3, 3, 6, 3, 1, true)
      .rotateX(Math.PI * 0.5)
      .rotateZ(Math.PI)
      .translate(0, 0.5, 0)
      .toNonIndexed();
    g.computeVertexNormals();
    const m = new THREE.MeshLambertMaterial({
      color: "#fff",
      side: THREE.BackSide,
      normalMap: new THREE.Texture(),
      normalScale: new THREE.Vector2().setScalar(0.25),
      onBeforeCompile: shader => {
        shader.uniforms.time = gu.time;
        shader.fragmentShader = `
          uniform float time;
          ${noise3d}
          
          float getNoise(vec2 p, float shift){
            float valBase = snoise(vec3(p, time * 0.5));
            float val = valBase;
            //val = (1. - pow(val, 0.25)) * sign(valBase);
            return val;
          }
          
          ${shader.fragmentShader}
        `.replace(
          `#include <normal_fragment_maps>`,
          `
          vec2 nMapUv = vNormalMapUv.xy * vec2(PI, 1.) * 10.;
          vec3 mapN = vec3(
            getNoise(nMapUv, 0.), 
            getNoise(nMapUv, 100.),
            1.
          );
          mapN = normalize(mapN);
          mapN.xy *= normalScale;
          normal = normalize( tbn * mapN );
          
          `
        );
      }
    });
    super(g, m);
  }
}

class Sketch extends THREE.Group {
  constructor() {
    super();
    this.updatables = [];
    
    this.add(new THREE.PointLight(0xff8800, 5, 3, 4));
    this.children[0].position.set(0, -0.25, 0);
    this.add(new THREE.AmbientLight(0xff8800, 0.1));
    
    // background
    this.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(200),
        new THREE.MeshLambertMaterial({color: "#fff", side: THREE.BackSide})
      )
    );
    
    const hut = new Hut();
    this.add(hut);
    this.add(new Central());
    this.add(new Vapourizing());
    this.add(new Vegetation(hut));
    this.add(new Petals());
    
    
  }
  
  update(){
    this.updatables.forEach(u => u.update());
  }
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  innerWidth / innerHeight,
  1,
  1000
);
camera.position.set(0, 0.25, 1).setLength(4);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const postprocessing = new Postprocessing(renderer, scene, camera);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  postprocessing.setSize(innerWidth, innerHeight);
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 6;
controls.maxPolarAngle = Math.PI * 0.5;

const sketch = new Sketch();
scene.add(sketch);

const clock = new THREE.Timer();
clock.connect(document);
let t = 0;

renderer.setAnimationLoop(() => {
  clock.update();
  const dt = clock.getDelta();
  t += dt;

  gu.time.value = t;
  gu.timeDelta.value = dt;

  controls.update();
  
  sketch.update();

  postprocessing.render();
  //renderer.render(scene, camera);
});

```
