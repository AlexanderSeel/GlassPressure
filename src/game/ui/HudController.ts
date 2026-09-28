import type { LevelPhase } from "../level/LevelState";
import type { DrillState } from "../tools/DrillController";

export type HudSnapshot = {
  levelPhase: LevelPhase;
  objective: string;
  failed: boolean;
  pressurePa: number;
  crackRisk01: number;
  diameterMeters: number;
  toolState: DrillState;
  alignment01: number;
  flowM3: number;
  selectedTargetLabel: string;
  sourceFill01: number;
  receiverFill01: number;
  sourceVolumeM3: number;
  hydraulicHeadMeters: number;
  innerHeightScene: number;
  innerXScene: number;
  bodySpeedScenePerSecond: number;
  nestedEnabled: boolean;
  nestedHeightScene: number;
  nestedFill01: number;
  qualityTier: string;
};

export class HudController {
  private readonly elements = {
    pressure: this.byId("pressure"),
    risk: this.byId("risk"),
    diameter: this.byId("diameter"),
    toolState: this.byId("tool-state"),
    alignment: this.byId("alignment"),
    flow: this.byId("flow"),
    levelState: this.byId("level-state"),
    sourceFill: this.byId("source-fill"),
    receiverFill: this.byId("receiver-fill"),
    sourceVolume: this.byId("source-volume"),
    hydraulicHead: this.byId("hydraulic-head"),
    innerHeight: this.byId("inner-height"),
    innerX: this.byId("inner-x"),
    bodyVelocity: this.byId("body-velocity"),
    selectedTarget: this.byId("selected-target"),
    nestedHeight: this.byId("nested-height"),
    nestedFill: this.byId("nested-fill"),
    quality: this.byId("quality-tier"),
  };

  public render(snapshot: HudSnapshot): void {
    this.elements.pressure.textContent = `${(snapshot.pressurePa / 1000).toFixed(1)} kPa`;
    this.elements.risk.textContent = snapshot.failed
      ? "FAILED"
      : `${Math.round(snapshot.crackRisk01 * 100)}%`;
    this.elements.diameter.textContent =
      `${(snapshot.diameterMeters * 1000).toFixed(0)} mm`;
    this.elements.toolState.textContent = snapshot.failed
      ? "glass failed"
      : snapshot.toolState;
    this.elements.alignment.textContent =
      `${Math.round(snapshot.alignment01 * 100)}%`;
    this.elements.flow.textContent =
      `${(snapshot.flowM3 * 60_000_000).toFixed(1)} mL/s`;
    this.elements.selectedTarget.textContent = snapshot.selectedTargetLabel;

    this.elements.levelState.textContent =
      snapshot.levelPhase === "won"
        ? "Complete — press R to replay"
        : snapshot.levelPhase === "failed"
          ? "Glass failed — press R to retry"
          : snapshot.objective;

    this.elements.sourceFill.textContent =
      `${Math.round(snapshot.sourceFill01 * 100)}%`;
    this.elements.receiverFill.textContent =
      `${Math.round(snapshot.receiverFill01 * 100)}%`;
    this.elements.sourceVolume.textContent =
      `${(snapshot.sourceVolumeM3 * 1000).toFixed(2)} L`;
    this.elements.hydraulicHead.textContent =
      `${snapshot.hydraulicHeadMeters.toFixed(2)} m`;
    this.elements.innerHeight.textContent =
      `${snapshot.innerHeightScene.toFixed(2)} m`;
    this.elements.innerX.textContent = `${snapshot.innerXScene.toFixed(2)} m`;
    this.elements.bodyVelocity.textContent =
      `${snapshot.bodySpeedScenePerSecond.toFixed(2)} m/s`;
    this.elements.nestedHeight.textContent = snapshot.nestedEnabled
      ? `${snapshot.nestedHeightScene.toFixed(2)} m`
      : "—";
    this.elements.nestedFill.textContent = snapshot.nestedEnabled
      ? `${Math.round(snapshot.nestedFill01 * 100)}%`
      : "—";
    this.elements.quality.textContent = snapshot.qualityTier.toUpperCase();
  }

  private byId(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing HUD element #${id}`);
    return element;
  }
}
