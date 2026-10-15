import * as THREE from './Материалы/three.module.min.js';
import {FloatingField} from './механика-фигур.js';

// Локальная сцена: без внешних моделей, CDN и сетевых запросов.
const stage = document.querySelector('.hero-stage');
const canvas = stage?.querySelector('canvas');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
if (stage && canvas) {
 try { createScene(); }
 catch (error) { stage.dataset.scene = 'fallback'; console.warn('3D-сцена недоступна, показана статичная композиция.', error.message); }
}

function createScene() {
 const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
 renderer.setClearColor(0x15171d);
 renderer.toneMapping = THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure = 1.15;
 renderer.shadowMap.enabled = false;
 const scene = new THREE.Scene();
 const camera = new THREE.PerspectiveCamera(35, 1, .1, 80);
 camera.position.set(0, 0, 20);

 // Студийное окружение даёт длинные, мягкие блики на глянце и металле.
 const studio = new THREE.Scene();
 const room = new THREE.Mesh(new THREE.BoxGeometry(30, 24, 30), new THREE.MeshBasicMaterial({color:0x303440, side:THREE.BackSide}));
 studio.add(room);
 function softbox(x,y,z,w,h,intensity) {
  const light = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({color:new THREE.Color().setScalar(intensity), side:THREE.DoubleSide}));
  light.position.set(x,y,z); light.lookAt(0,0,0); studio.add(light);
 }
 softbox(-7,8,6,7,12,7);
 softbox(8,3,5,3,11,4);
 softbox(0,10,-5,12,4,5);
 softbox(-2,-6,8,9,2,1.2);
 const pmrem = new THREE.PMREMGenerator(renderer);
 const environment = pmrem.fromScene(studio, .06);
 scene.environment = environment.texture;
 studio.traverse(object => {object.geometry?.dispose(); object.material?.dispose();});
 pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xdce5ff, 0x171824, 1.25));
 const key = new THREE.DirectionalLight(0xf5f6ff, 2.6);
 key.position.set(-5,8,10);
 scene.add(key);
 const rim = new THREE.DirectionalLight(0x92adff, 2);
 rim.position.set(7,1,-1); scene.add(rim);
 scene.background = new THREE.Color(0x20232b);
 const blue = new THREE.MeshPhysicalMaterial({color:0x1637ef,metalness:.24,roughness:.19,clearcoat:1,clearcoatRoughness:.16,envMapIntensity:1.1});
 const milk = new THREE.MeshStandardMaterial({color:0xdededa,metalness:.06,roughness:.38,envMapIntensity:.7});
 const silver = new THREE.MeshStandardMaterial({color:0x9da8bf,metalness:1,roughness:.22,envMapIntensity:1.35});
 const graphite = new THREE.MeshPhysicalMaterial({color:0x242731,metalness:.5,roughness:.27,clearcoat:.6});
 const matteBlue = new THREE.MeshStandardMaterial({color:0x2447df,metalness:0,roughness:.86,envMapIntensity:.28});
 const matteMilk = new THREE.MeshStandardMaterial({color:0xdededa,metalness:0,roughness:.94,envMapIntensity:.25});
 const matteGraphite = new THREE.MeshStandardMaterial({color:0x494d59,metalness:0,roughness:.9,envMapIntensity:.3});
 const finishes = new Map([[blue,'глянец'],[milk,'сатин'],[silver,'металл'],[graphite,'глянец'],[matteBlue,'матовый'],[matteMilk,'матовый'],[matteGraphite,'матовый']]);

 // Выбранная Аней мягкая четырёхлучевая звезда из листа вариантов.
 const points=Array.from({length:8},(_,i)=>{
  const angle=Math.PI/2+i*Math.PI/4,radius=i%2?.62:1.7;
  return [Math.cos(angle)*radius,Math.sin(angle)*radius];
 });
 const outline=new THREE.Shape();
 points.forEach(([x,y],i)=>{
  const previous=points[(i+7)%8],next=points[(i+1)%8],rounding=.28;
  const sx=x+(previous[0]-x)*rounding,sy=y+(previous[1]-y)*rounding;
  const ex=x+(next[0]-x)*rounding,ey=y+(next[1]-y)*rounding;
  if(i===0)outline.moveTo(sx,sy);else outline.lineTo(sx,sy);
  outline.quadraticCurveTo(x,y,ex,ey);
 });
 outline.closePath();
 const star=new THREE.ExtrudeGeometry(outline,{depth:.65,bevelEnabled:true,bevelSegments:12,steps:1,bevelSize:.2,bevelThickness:.2,curveSegments:24});
 // ExtrudeGeometry дублирует вершины граней: объединяем их нормали,
 // чтобы крупные скругления не выглядели ступенчатыми в студийном свете.
 const vertices=star.attributes.position,normals=star.attributes.normal,normalGroups=new Map(),vertexKeys=[];
 for(let i=0;i<vertices.count;i++){
  const key=[vertices.getX(i),vertices.getY(i),vertices.getZ(i)].map(v=>Math.round(v*1e5)).join(':');
  vertexKeys.push(key);
  if(!normalGroups.has(key))normalGroups.set(key,new THREE.Vector3());
  normalGroups.get(key).add(new THREE.Vector3(normals.getX(i),normals.getY(i),normals.getZ(i)));
 }
 for(const normal of normalGroups.values())normal.normalize();
 star.computeBoundingBox();
 for(let i=0;i<vertices.count;i++){
  const z=vertices.getZ(i),normal=normalGroups.get(vertexKeys[i]);
  // Плоские лицевые стороны не должны выдавать треугольники сетки в отражениях.
  if(Math.abs(z-star.boundingBox.max.z)<1e-5)normals.setXYZ(i,0,0,1);
  else if(Math.abs(z-star.boundingBox.min.z)<1e-5)normals.setXYZ(i,0,0,-1);
  else normals.setXYZ(i,normal.x,normal.y,normal.z);
 }
 normals.needsUpdate=true;
 star.center();star.computeBoundingSphere();
 // Сохраняем крупный габарит прежних фигур и точный сферический запас для вращения.
 const starFit=1.82/star.boundingSphere.radius;
 star.scale(starFit,starFit,starFit);star.computeBoundingSphere();
 const originals = [
  {geometry:star,material:blue,position:[-8,.65,.5],rotation:[.55,-.35,-.4],scale:1.25},
  {geometry:star,material:milk,position:[-4.1,2,-.3],rotation:[-.4,.35,.5],scale:1.15},
  {geometry:star,material:silver,position:[.25,-.05,.9],rotation:[.45,-.48,-.52],scale:1.15},
  {geometry:star,material:blue,position:[4.1,2,-.55],rotation:[.95,.15,.5],scale:1.05},
  {geometry:star,material:milk,position:[8,-.1,.3],rotation:[-.35,-.45,-.75],scale:1.35},
  {geometry:star,material:graphite,position:[-4.8,-2.3,-.7],rotation:[.4,.4,-.95],scale:1.1},
  {geometry:star,material:blue,position:[4.9,-2,.3],rotation:[.6,-.4,1.05],scale:1.12}
 ];
 // Одна форма в разных размерах и материалах; механика отбрасывания прежняя.
 const specifications=Array.from({length:24},(_,index)=>{
  const original=originals[index%originals.length],group=Math.floor(index/originals.length);
  const matte = original.material===blue?matteBlue:original.material===milk?matteMilk:matteGraphite;
  // Чередуем матовые и глянцевые поверхности; металл оставляем отражающим.
  const material=original.material!==silver&&index%3!==0?matte:original.material;
  return {...original,material,rotation:[.2+Math.sin(index*1.7)*.45,Math.sin(index*.93)*.55,original.rotation[2]+group*.91]};
 });
 const field=new FloatingField();
 field.depth=[-6,2.6];field.crop=.7;
 const bodies=specifications.map(spec=>{
  const mesh=new THREE.Mesh(spec.geometry,spec.material);
  mesh.rotation.set(...spec.rotation);scene.add(mesh);
  const physical=field.add({x:0,y:0,z:0,radius:1,rotation:spec.rotation});
  return {mesh,physical,spec};
 });
 let frame=0,lastTime=0,visible=true,contextLost=false,renderCount=0,width=0,height=0;
 let worldWidth=0,worldHeight=0,initialized=false,layoutKey='';
 let startupPending=true,startupRuns=0,documentReady=document.readyState==='complete';
 let awaitingAnchor=false;
 try{
  const target=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)));
  awaitingAnchor=!!target&&target.getBoundingClientRect().top>=stage.getBoundingClientRect().bottom;
 }catch{/* Некорректный якорь не мешает обычному запуску. */}
 const pointer={x:0,y:0,time:0,active:false};
 const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0),hit=new THREE.Vector3();
 function syncMeshes(){for(const {mesh,physical:b} of bodies){mesh.position.set(b.x,b.y,b.z);mesh.rotation.set(...b.rotation);}}
 function resize(){
  const nextWidth=stage.clientWidth,nextHeight=stage.clientHeight;
  if(initialized&&nextWidth===width&&nextHeight===height)return;
  width=nextWidth;height=nextHeight;
  renderer.setSize(width,height,false);camera.aspect=width/height;
  const mobile=width<640,previousWidth=worldWidth,previousHeight=worldHeight;
  camera.position.z=mobile?19:20;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  worldHeight=2*Math.tan(THREE.MathUtils.degToRad(17.5))*camera.position.z;
  worldWidth=worldHeight*camera.aspect;
  field.width=worldWidth;field.height=worldHeight;
  const count=mobile?14:24;
  const nextKey=mobile?'узкий':'широкий';
  const rearrange=!initialized||layoutKey!==nextKey;
  // Поздний пересчёт размеров (шрифты, панель браузера) не гасит стартовый
  // импульс и движение от курсора. При смене состава сцены раскладка новая.
  const momentum=!rearrange?field.bodies.map(b=>({
   vx:b.vx*worldWidth/previousWidth,vy:b.vy*worldHeight/previousHeight,vz:b.vz,
   wx:b.wx,wy:b.wy,wz:b.wz
  })):null;
  field.cameraZ=camera.position.z;
  let seed=947;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const placed=[];
  bodies.forEach(({mesh,physical:b,spec},index)=>{
   mesh.visible=index<count;
   if(!mesh.visible)return;
   // Крупные передние формы и более мелкие задние; никаких строк и колонок.
   const size=(mobile?.82:Math.min(1.36,worldWidth/19))*(.87+(Math.sin(index*7.13)+1)*.22);
   mesh.scale.setScalar(size*spec.scale/1.2*1.18);
   b.radius=mesh.scale.x*star.boundingSphere.radius;
   if(rearrange){
    let best=null,bestScore=-Infinity;
    // Выбираем свободное место в объёме, не выравнивая центры по сетке.
    for(let attempt=0;attempt<100;attempt++){
     const x=(random()-.5)*worldWidth*(mobile?.91:.69);
     const y=(random()-.5)*worldHeight*1.18;
     const z=-5.8+random()*8;
     const score=placed.length?Math.min(...placed.map(other=>Math.hypot(x-other.x,y-other.y,z-other.z)/(b.radius+other.radius))):1;
     if(score>bestScore){bestScore=score;best={x,y,z};}
     if(score>1.04)break;
    }
    Object.assign(b,best);b.rotation=[...spec.rotation];
   }else{b.x*=worldWidth/previousWidth;b.y*=worldHeight/previousHeight;}
   field.contain(b);placed.push(b);
  });
  field.bodies=bodies.slice(0,count).map(body=>body.physical);
  field.stop();
  for(let pass=0;pass<70;pass++)field.step(1/120);
  field.stop();
  if(momentum&&!reducedMotion.matches)field.bodies.forEach((b,i)=>Object.assign(b,momentum[i]));
  syncMeshes();initialized=true;layoutKey=nextKey;
  releasePointer();tryStartup();requestRender();
 }
 function tryStartup(){
  if(!startupPending||awaitingAnchor||!documentReady||!initialized||!visible||document.hidden||contextLost||document.body.classList.contains('animating'))return;
  const rect=stage.getBoundingClientRect();
  if(rect.bottom<=0||rect.top>=innerHeight)return;
  startupPending=false;
  if(reducedMotion.matches)return;
  // Заметный разнонаправленный импульс без почти нулевых случайных скоростей.
  // Дальше — обычные столкновения и затухание; курсор может вмешаться сразу.
  for(const [index,body] of field.bodies.entries()){
   const scale=Math.min(1.3,Math.max(.65,body.radius/2));
   const angle=index*2.39996+(Math.random()-.5)*.9;
   const speed=(4.2+Math.random()*2)*scale;
   const spin=()=> (Math.random()<.5?-1:1)*(.55+Math.random()*.45);
   body.vx+=Math.cos(angle)*speed;
   body.vy+=Math.sin(angle)*speed*.75;
   body.vz+=(Math.random()-.5)*2.2;
   body.wx+=spin();
   body.wy+=spin();
   body.wz+=spin()*.8;
   field.limit(body);
  }
  startupRuns++;lastTime=0;requestRender();
 }
 function requestRender(){if(!frame&&visible&&!document.hidden&&!contextLost)frame=requestAnimationFrame(render);}
 function render(time){
  frame=0;
  const dt=lastTime?Math.min((time-lastTime)/1000,.05):1/60;lastTime=time;
  // Настройка может обновиться раньше события change: сразу гасим инерцию,
  // чтобы она не осталась замороженной и не продолжилась при следующем кадре.
  if(reducedMotion.matches)field.stop();
  else field.advance(dt);
  syncMeshes();renderer.render(scene,camera);renderCount++;stage.dataset.scene='ready';
  if(!reducedMotion.matches&&field.moving)requestRender();
  else lastTime=0;
 }
 function move(event){
  if(reducedMotion.matches)return;
  if(event.target.closest('a,button')){releasePointer();return;}
  if(event.pointerType==='touch'&&event.type!=='pointerdown')return;
  const rect=stage.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
  raycaster.ray.intersectPlane(plane,hit);
  const now=performance.now(),isTap=event.pointerType==='touch'||event.type==='pointerdown';
  const fresh=!pointer.active||now-pointer.time>250;
  const from=fresh?{x:hit.x,y:hit.y}:{x:pointer.x,y:pointer.y};
  field.poke(from,hit,fresh?1/60:(now-pointer.time)/1000,{tap:isTap||fresh});
  pointer.x=hit.x;pointer.y=hit.y;pointer.time=now;pointer.active=event.pointerType!=='touch';
  requestRender();
 }
 function releasePointer(){pointer.active=false;}
 stage.addEventListener('pointermove',move,{passive:true});
 stage.addEventListener('pointerdown',move,{passive:true});
 stage.addEventListener('pointerleave',releasePointer);stage.addEventListener('pointercancel',releasePointer);
 addEventListener('blur',releasePointer);
 document.addEventListener('keydown',event=>{if(event.key==='Tab')releasePointer();});
 new ResizeObserver(resize).observe(stage);
 // Даём браузеру завершить переход по якорю и восстановить прокрутку.
 // Иначе импульс успевает сработать до ухода к контактам внизу страницы.
 addEventListener('load',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
  documentReady=true;tryStartup();
 })),{once:true});
 addEventListener('portfolio:intro-start',()=>{startupPending=true;awaitingAnchor=false;field.stop();releasePointer();});
 addEventListener('portfolio:intro-end',tryStartup);
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;lastTime=0;releasePointer();if(visible){tryStartup();requestRender();}else{awaitingAnchor=false;cancelAnimationFrame(frame);frame=0;}},{threshold:0}).observe(stage);
 document.addEventListener('visibilitychange',()=>{lastTime=0;releasePointer();if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{tryStartup();requestRender();}});
 reducedMotion.addEventListener('change',()=>{field.stop();releasePointer();requestRender();});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;cancelAnimationFrame(frame);frame=0;stage.dataset.scene='fallback';});
 canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;lastTime=0;tryStartup();requestRender();});
 // Только чтение: состояние для проверки инерции, остановки и адаптивности.
 window.portfolioScene=Object.freeze({snapshot:()=>({status:stage.dataset.scene,renderCount,visible,startupRuns,startupPending,reducedMotion:reducedMotion.matches,moving:field.moving,shadows:renderer.shadowMap.enabled,finishes:bodies.filter(b=>b.mesh.visible).map(b=>finishes.get(b.spec.material)),positions:bodies.filter(b=>b.mesh.visible).map(b=>b.mesh.position.toArray()),radii:bodies.filter(b=>b.mesh.visible).map(b=>b.physical.radius),bounds:[worldWidth,worldHeight],depth:field.depth,crop:field.crop,cameraZ:camera.position.z,screenPositions:bodies.filter(b=>b.mesh.visible).map(b=>{const p=b.mesh.position.clone().project(camera);return [(p.x+1)*width/2,(1-p.y)*height/2];}),rotations:bodies.filter(b=>b.mesh.visible).map(b=>[b.mesh.rotation.x,b.mesh.rotation.y,b.mesh.rotation.z])})});
 resize();
}
