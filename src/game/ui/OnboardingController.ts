export type OnboardingSnapshot = {
  levelId: string;
  sourceFill01: number;
  primaryDrainOpen: boolean;
  nestedDrainOpen: boolean;
  nestedHeightScene: number;
  nestedEscaped: boolean;
};

export class OnboardingController {
  private readonly root = this.byId("level-coach");
  private readonly step = this.byId("level-coach-step");
  private readonly title = this.byId("level-coach-title");
  private readonly text = this.byId("level-coach-text");

  private lastKey = "";

  public render(snapshot: OnboardingSnapshot): void {
    if (snapshot.levelId !== "nested-lift") {
      this.root.dataset.visible = "false";
      this.lastKey = "";
      return;
    }

    const state = this.resolveState(snapshot);
    this.root.dataset.visible = "true";

    if (state.key === this.lastKey) return;
    this.lastKey = state.key;

    this.step.textContent = state.step;
    this.title.textContent = state.title;
    this.text.textContent = state.text;

    this.root.classList.remove("coach-pulse");
    void this.root.offsetWidth;
    this.root.classList.add("coach-pulse");
  }

  private resolveState(snapshot: OnboardingSnapshot): {
    key: string;
    step: string;
    title: string;
    text: string;
  } {
    if (snapshot.nestedEscaped) {
      return {
        key: "complete",
        step: "5 / 5",
        title: "Nested cup released",
        text: "The inner vessel cleared the parent rim. The core loop is complete.",
      };
    }

    if (snapshot.nestedDrainOpen) {
      return {
        key: "escape",
        step: "5 / 5",
        title: "Let the water wash it out",
        text: "The inner cup is lighter now. Watch buoyancy, flow and contact push it over the rim.",
      };
    }

    if (snapshot.nestedHeightScene >= 3.02) {
      return {
        key: "nested-drill",
        step: "4 / 5",
        title: "Drill the rising inner cup",
        text: "Hold on the purple target. Read the bore mark and fine cracks, not a progress bar.",
      };
    }

    if (snapshot.primaryDrainOpen) {
      return {
        key: "rise",
        step: "3 / 5",
        title: "Watch the inner cup rise",
        text: "Water and buoyancy are changing the nested body. Wait until its purple target becomes reachable.",
      };
    }

    if (snapshot.sourceFill01 >= 0.16) {
      return {
        key: "parent-drill",
        step: "2 / 5",
        title: "Open the parent transfer port",
        text: "Drill the cyan target to change the flow path. The opening stays permanently active.",
      };
    }

    return {
      key: "fill",
      step: "1 / 5",
      title: "Let the parent cup fill",
      text: "Watch the water reach the nested glass. The cups should stay resting until buoyancy actually reaches them.",
    };
  }

  private byId(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing onboarding element #${id}`);
    return element;
  }
}
