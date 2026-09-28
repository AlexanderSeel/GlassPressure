import{describe,expect,it}from"vitest";
import{FluidSystem,type FluidCompartment}from"./FluidSystem";

function vessel():FluidCompartment{return{id:"test",capacityM3:.01,volumeM3:.009,heightMeters:.4,densityKgM3:1000,inletM3PerSecond:0,holes:[]}}

describe("FluidSystem",()=>{
  it("preserves volume without inlet or holes",()=>{const model=vessel();const system=new FluidSystem();system.step(model,1/60);expect(model.volumeM3).toBeCloseTo(.009)});
  it("drains through a submerged hole",()=>{const model=vessel();const system=new FluidSystem();system.addHole(model,.01,.05);system.step(model,.05);expect(model.volumeM3).toBeLessThan(.009)});
  it("larger holes drain faster",()=>{const small=vessel();const large=vessel();const system=new FluidSystem();system.addHole(small,.004,.05);system.addHole(large,.012,.05);system.step(small,.05);system.step(large,.05);expect(large.volumeM3).toBeLessThan(small.volumeM3)});
});
