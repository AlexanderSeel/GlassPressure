import HavokPhysics from "@babylonjs/havok";
import {
  ArcRotateCamera,Color3,Color4,DirectionalLight,Engine,HavokPlugin,HemisphericLight,
  Mesh,MeshBuilder,PhysicsAggregate,PhysicsShapeType,PBRMaterial,Scene,StandardMaterial,Vector3
}from"@babylonjs/core";
import{FluidSystem,type FluidCompartment}from"./simulation/FluidSystem";
import{createGlassMaterial,createWaterMaterial}from"./scene/materials";

const DIAMETERS=[0.006,0.01,0.016]as const;

export class Game{
  private readonly engine:Engine;
  private readonly scene:Scene;
  private readonly fluid=new FluidSystem();
  private vessel!:FluidCompartment;
  private waterMesh!:Mesh;
  private dynamicBody!:PhysicsAggregate;
  private drillTarget!:Mesh;
  private drillProgress=0;
  private crackRisk=0;
  private diameterIndex=1;
  private drilling=false;
  private holeCreated=false;

  public constructor(private readonly canvas:HTMLCanvasElement){
    this.engine=new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,adaptToDeviceRatio:true});
    this.scene=new Scene(this.engine);
  }

  public async start():Promise<void>{
    await this.configurePhysics();
    this.createEnvironment();
    this.createPuzzle();
    this.bindInput();
    this.engine.runRenderLoop(()=>{this.update(this.engine.getDeltaTime()/1000);this.scene.render()});
    window.addEventListener("resize",()=>this.engine.resize());
  }

  private async configurePhysics():Promise<void>{
    const havok=await HavokPhysics();
    this.scene.enablePhysics(new Vector3(0,-9.81,0),new HavokPlugin(true,havok));
  }

  private createEnvironment():void{
    this.scene.clearColor=new Color4(.025,.055,.07,1);
    this.scene.environmentIntensity=.75;
    const camera=new ArcRotateCamera("orbit-camera",Math.PI*1.25,Math.PI*.34,11,new Vector3(0,1.7,0),this.scene);
    camera.lowerRadiusLimit=6;camera.upperRadiusLimit=16;camera.lowerBetaLimit=.25;camera.upperBetaLimit=Math.PI*.49;camera.wheelPrecision=45;camera.panningSensibility=0;
    camera.attachControl(this.canvas,true);
    const hemi=new HemisphericLight("ambient",new Vector3(0,1,0),this.scene);hemi.intensity=.8;hemi.diffuse=new Color3(.68,.82,.88);
    const key=new DirectionalLight("key",new Vector3(-.5,-1,.35),this.scene);key.position=new Vector3(5,10,-6);key.intensity=2.1;
    const floor=MeshBuilder.CreateGround("floor",{width:12,height:12},this.scene);
    const floorMaterial=new PBRMaterial("floor-material",this.scene);floorMaterial.albedoColor=new Color3(.06,.1,.105);floorMaterial.roughness=.28;floor.material=floorMaterial;
    new PhysicsAggregate(floor,PhysicsShapeType.BOX,{mass:0,friction:.75},this.scene);
    const chamber=MeshBuilder.CreateBox("chamber",{width:7.2,height:6.4,depth:7.2},this.scene);
    chamber.position.y=3.2;chamber.material=createGlassMaterial("chamber-glass",this.scene);chamber.visibility=.22;chamber.isPickable=false;
  }

  private createPuzzle():void{
    const glass=createGlassMaterial("vessel-glass",this.scene);
    const water=createWaterMaterial("water",this.scene);

    const outer=MeshBuilder.CreateCylinder("outer-vessel",{diameter:4.9,height:1.7,tessellation:64},this.scene);
    outer.position.y=1.35;outer.material=glass;
    new PhysicsAggregate(outer,PhysicsShapeType.CYLINDER,{mass:0},this.scene);

    const upper=MeshBuilder.CreateCylinder("upper-vessel",{diameter:3.6,height:1.25,tessellation:64},this.scene);
    upper.position.y=3.65;upper.material=glass;
    new PhysicsAggregate(upper,PhysicsShapeType.CYLINDER,{mass:0},this.scene);

    this.waterMesh=MeshBuilder.CreateCylinder("upper-water",{diameter:3.35,height:1,tessellation:64},this.scene);
    this.waterMesh.position.y=3.4;this.waterMesh.material=water;

    const inner=MeshBuilder.CreateSphere("inner-vessel",{diameter:1.15,segments:32},this.scene);
    inner.position=new Vector3(.45,2.6,0);inner.material=glass;
    this.dynamicBody=new PhysicsAggregate(inner,PhysicsShapeType.SPHERE,{mass:.42,restitution:.08,friction:.45},this.scene);

    const innerFluid=MeshBuilder.CreateSphere("inner-fluid",{diameter:.82,segments:24},this.scene);
    innerFluid.parent=inner;innerFluid.position.y=-.08;innerFluid.scaling.y=.62;
    const innerWater=new PBRMaterial("inner-water-material",this.scene);
    innerWater.albedoColor=new Color3(.03,.55,.34);innerWater.emissiveColor=new Color3(.01,.08,.04);innerWater.alpha=.72;innerFluid.material=innerWater;

    this.drillTarget=MeshBuilder.CreateTorus("drill-target",{diameter:.56,thickness:.055,tessellation:48},this.scene);
    this.drillTarget.position=new Vector3(0,3.68,-1.82);this.drillTarget.rotation.x=Math.PI/2;
    const targetMat=new StandardMaterial("target-material",this.scene);
    targetMat.diffuseColor=new Color3(.08,.8,1);targetMat.emissiveColor=new Color3(.04,.6,.95);targetMat.alpha=.82;this.drillTarget.material=targetMat;

    const inlet=MeshBuilder.CreateCylinder("inlet-stream",{diameter:.18,height:3.2,tessellation:20},this.scene);
    inlet.position.y=5.55;inlet.material=water;inlet.isPickable=false;

    this.vessel={id:"upper",capacityM3:.012,volumeM3:.0084,heightMeters:.52,densityKgM3:1000,inletM3PerSecond:.000026,holes:[]};
  }

  private bindInput():void{
    this.canvas.addEventListener("pointerdown",event=>{
      if(event.button!==0)return;
      const pick=this.scene.pick(this.scene.pointerX,this.scene.pointerY);
      if(pick?.pickedMesh===this.drillTarget)this.drilling=true;
    });
    window.addEventListener("pointerup",()=>{this.drilling=false;this.drillProgress=Math.max(0,this.drillProgress-.05)});
    window.addEventListener("keydown",event=>{
      if(event.key==="1")this.diameterIndex=0;
      if(event.key==="2")this.diameterIndex=1;
      if(event.key==="3")this.diameterIndex=2;
      this.updateHud();
    });
  }

  private update(dt:number):void{
    const result=this.fluid.step(this.vessel,dt);
    const fill=this.fluid.getFillRatio(this.vessel);
    this.updateWaterMesh(fill);

    if(this.drilling&&!this.holeCreated){
      const instability=.42+this.diameterIndex*.23;
      this.drillProgress+=dt*.34;
      this.crackRisk=Math.min(1,this.crackRisk+dt*instability*.11);
      if(this.drillProgress>=1){
        this.fluid.addHole(this.vessel,this.selectedDiameter,.08);
        this.holeCreated=true;this.drilling=false;this.drillTarget.scaling.setAll(.55);
      }
    }else this.crackRisk=Math.max(0,this.crackRisk-dt*.018);

    const velocity=this.dynamicBody.body.getLinearVelocity();
    const drainBoost=this.holeCreated?(1-fill)*5.2:0;
    const fluidDamping=-velocity.y*.55;
    const bodyPosition=this.dynamicBody.transformNode.getAbsolutePosition();
    this.dynamicBody.body.applyForce(new Vector3(0,drainBoost+fluidDamping,0),bodyPosition);

    if(this.holeCreated&&result.outflowM3>0){
      const jet=Math.min(1.5,result.outflowM3*450000);
      this.dynamicBody.body.applyForce(new Vector3(jet,.15*jet,0),bodyPosition);
    }
    this.updateHud(result.pressurePa);
  }

  private updateWaterMesh(fill:number):void{
    const minHeight=.03;
    const height=minHeight+fill*1.02;
    this.waterMesh.scaling.y=height;
    this.waterMesh.position.y=3.06+height*.5;
  }

  private get selectedDiameter():number{return DIAMETERS[this.diameterIndex]??0.01;}

  private updateHud(pressurePa?:number):void{
    const pressure=document.querySelector<HTMLElement>("#pressure");
    const risk=document.querySelector<HTMLElement>("#risk");
    const diameter=document.querySelector<HTMLElement>("#diameter");
    if(pressure&&pressurePa!==undefined)pressure.textContent=`${(pressurePa/1000).toFixed(1)} kPa`;
    if(risk)risk.textContent=`${Math.round(this.crackRisk*100)}%`;
    if(diameter)diameter.textContent=`${(this.selectedDiameter*1000).toFixed(0)} mm`;
  }
}
