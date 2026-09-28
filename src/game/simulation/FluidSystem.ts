export type Hole={diameterMeters:number;dischargeCoefficient:number;elevationMeters:number};
export type FluidCompartment={id:string;capacityM3:number;volumeM3:number;heightMeters:number;densityKgM3:number;inletM3PerSecond:number;holes:Hole[]};
export type FluidStepResult={outflowM3:number;pressurePa:number};
const GRAVITY=9.81;

export class FluidSystem{
  public step(compartment:FluidCompartment,dtSeconds:number):FluidStepResult{
    const safeDt=Math.max(0,Math.min(dtSeconds,0.05));
    const capacity=Math.max(compartment.capacityM3,Number.EPSILON);
    const fillRatio=Math.min(1,Math.max(0,compartment.volumeM3/capacity));
    const liquidHeight=fillRatio*compartment.heightMeters;
    const rho=compartment.densityKgM3;
    const pressurePa=rho*GRAVITY*liquidHeight;
    let outflowRate=0;
    for(const hole of compartment.holes){
      const head=Math.max(0,liquidHeight-hole.elevationMeters);
      if(head<=0)continue;
      const radius=hole.diameterMeters/2;
      const area=Math.PI*radius*radius;
      outflowRate+=hole.dischargeCoefficient*area*Math.sqrt(2*GRAVITY*head);
    }
    const inletVolume=compartment.inletM3PerSecond*safeDt;
    const requestedOutflow=outflowRate*safeDt;
    const available=Math.max(0,compartment.volumeM3+inletVolume);
    const actualOutflow=Math.min(requestedOutflow,available);
    compartment.volumeM3=Math.min(compartment.capacityM3,Math.max(0,available-actualOutflow));
    return{outflowM3:actualOutflow,pressurePa};
  }

  public addHole(compartment:FluidCompartment,diameterMeters:number,elevationMeters=0):Hole{
    const hole:Hole={diameterMeters,elevationMeters,dischargeCoefficient:0.62};
    compartment.holes.push(hole);
    return hole;
  }

  public getFillRatio(compartment:FluidCompartment):number{
    return Math.min(1,Math.max(0,compartment.volumeM3/Math.max(compartment.capacityM3,Number.EPSILON)));
  }
}
