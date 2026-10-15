// Свободное движение в объёме. Сферические столкновения приближённые:
// отверстия фигур не участвуют, но объекты разных планов могут перекрываться в кадре.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export class FloatingField {
 constructor(){this.bodies=[];this.width=20;this.height=12;this.accumulator=0;this.depth=null;this.crop=0;this.cameraZ=20;}
 add({x,y,z=0,radius=1,rotation=[0,0,0]}){
  const body={x,y,z,radius,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0,rotation:[...rotation]};
  this.bodies.push(body);return body;
 }
 stop(){for(const b of this.bodies){b.vx=b.vy=b.vz=b.wx=b.wy=b.wz=0;}this.accumulator=0;}
 get moving(){return this.bodies.some(b=>Math.abs(b.vx)+Math.abs(b.vy)+Math.abs(b.vz)+Math.abs(b.wx)+Math.abs(b.wy)+Math.abs(b.wz)>.001);}
 poke(from,to,seconds,{tap=false}={}){
  const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);
  const speed=length/Math.max(seconds,1/120);
  for(const [index,b] of this.bodies.entries()){
   const projection=this.depth?this.cameraZ/(this.cameraZ-b.z):1;
   const bx=b.x*projection,by=b.y*projection;
   const t=length>.001?clamp(((bx-from.x)*dx+(by-from.y)*dy)/(length*length),0,1):1;
   const px=from.x+t*dx,py=from.y+t*dy;
   const rx=bx-px,ry=by-py,distance=Math.hypot(rx,ry),reach=b.radius*projection+.9;
   if(distance>=reach)continue;
   const nx=distance>.05?rx/distance:Math.cos(index*2.4+.5);
   const ny=distance>.05?ry/distance:Math.sin(index*2.4+.5);
   const influence=1-distance/reach;
   const strength=(tap?10:Math.min(19,length*9+.3)*clamp(speed/16,.55,2.2))*Math.sqrt(influence);
   const ux=length>.001?dx/length:nx,uy=length>.001?dy/length:ny;
   const ix=(ux*1.05+nx*.85)*strength/projection,iy=(uy*1.05+ny*.85)*strength/projection;
   b.vx+=ix;b.vy+=iy;
   if(this.depth)b.vz-=strength*.18;
   b.wx-=iy*.3;b.wy+=ix*.3;b.wz+=(nx*iy-ny*ix)*.5;
   this.limit(b);
  }
 }
 limit(b){
  const speed=Math.hypot(b.vx,b.vy,b.vz);if(speed>28){b.vx*=28/speed;b.vy*=28/speed;b.vz*=28/speed;}
  for(const axis of ['wx','wy','wz'])b[axis]=clamp(b[axis],-5,5);
 }
 advance(seconds){
  this.accumulator+=Math.min(seconds,.05);
  const dt=1/120;
  while(this.accumulator>=dt){this.step(dt);this.accumulator-=dt;}
  return this.moving;
 }
 step(dt){
  for(const b of this.bodies){
   b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
   b.rotation[0]+=b.wx*dt;b.rotation[1]+=b.wy*dt;b.rotation[2]+=b.wz*dt;
   b.vx*=Math.exp(-1.05*dt);b.vy*=Math.exp(-1.05*dt);b.vz*=Math.exp(-1.3*dt);
   b.wx*=Math.exp(-.85*dt);b.wy*=Math.exp(-.85*dt);b.wz*=Math.exp(-.85*dt);
  }
  // Несколько проходов разделяют группы соприкасающихся фигур без жёстких рывков.
  for(let pass=0;pass<4;pass++){
   for(let i=0;i<this.bodies.length;i++)for(let j=i+1;j<this.bodies.length;j++){
    const a=this.bodies[i],b=this.bodies[j],dx=b.x-a.x,dy=b.y-a.y,dz=this.depth?b.z-a.z:0;
    const distance=Math.hypot(dx,dy,dz),contact=a.radius+b.radius;
    if(distance>=contact)continue;
    const nx=distance>.001?dx/distance:1,ny=distance>.001?dy/distance:0,nz=distance>.001?dz/distance:0;
    const inverseA=1/(a.radius*a.radius),inverseB=1/(b.radius*b.radius),sum=inverseA+inverseB;
    const overlap=(contact-distance+.0001)*.9;
    a.x-=nx*overlap*inverseA/sum;a.y-=ny*overlap*inverseA/sum;a.z-=nz*overlap*inverseA/sum;
    b.x+=nx*overlap*inverseB/sum;b.y+=ny*overlap*inverseB/sum;b.z+=nz*overlap*inverseB/sum;
    const approach=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny+(b.vz-a.vz)*nz;
    if(approach>=0)continue;
    const impulse=-(1+.62)*approach/sum;
    a.vx-=nx*impulse*inverseA;a.vy-=ny*impulse*inverseA;a.vz-=nz*impulse*inverseA;
    b.vx+=nx*impulse*inverseB;b.vy+=ny*impulse*inverseB;b.vz+=nz*impulse*inverseB;
    const tangent=(b.vx-a.vx)*(-ny)+(b.vy-a.vy)*nx;
    const friction=clamp(-tangent/sum,-impulse*.12,impulse*.12);
    a.vx+=ny*friction*inverseA;a.vy-=nx*friction*inverseA;
    b.vx-=ny*friction*inverseB;b.vy+=nx*friction*inverseB;
    a.wz-=friction*inverseA/a.radius;b.wz-=friction*inverseB/b.radius;
   }
   for(const b of this.bodies)this.contain(b);
  }
  for(const b of this.bodies){
   this.limit(b);
   if(Math.hypot(b.vx,b.vy,b.vz)<.025)b.vx=b.vy=b.vz=0;
   for(const axis of ['wx','wy','wz'])if(Math.abs(b[axis])<.008)b[axis]=0;
  }
 }
 contain(b){
  const perspective=this.depth?(this.cameraZ-b.z)/this.cameraZ:1;
  const extentX=Math.max(.1,this.width*perspective/2-b.radius*(1-this.crop)-.2),extentY=Math.max(.1,this.height*perspective/2-b.radius*(1-this.crop)-.3);
  if(b.x < -extentX){b.x=-extentX;if(b.vx<0)b.vx*=-.65;}
  if(b.x > extentX){b.x=extentX;if(b.vx>0)b.vx*=-.65;}
  if(b.y < -extentY){b.y=-extentY;if(b.vy<0)b.vy*=-.65;}
  if(b.y > extentY){b.y=extentY;if(b.vy>0)b.vy*=-.65;}
  if(this.depth){
   if(b.z<this.depth[0]){b.z=this.depth[0];if(b.vz<0)b.vz*=-.45;}
   if(b.z>this.depth[1]){b.z=this.depth[1];if(b.vz>0)b.vz*=-.45;}
  }
 }
}
