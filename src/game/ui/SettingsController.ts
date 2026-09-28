import type { QualityPreference } from "../quality/QualitySettings";

const STORAGE_KEY = "glass-pressure-quality";

export class SettingsController {
  private readonly panel: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly quality: HTMLSelectElement;

  public constructor(currentQuality: QualityPreference) {
    this.panel = this.byId<HTMLElement>("settings-panel");
    this.toggle = this.byId<HTMLButtonElement>("settings-toggle");
    this.quality = this.byId<HTMLSelectElement>("quality-select");

    this.quality.value = currentQuality;
    this.toggle.addEventListener("click", () => this.togglePanel());
    this.quality.addEventListener("change", () => {
      const value = this.quality.value as QualityPreference;
      window.localStorage.setItem(STORAGE_KEY, value);
      window.location.reload();
    });
  }

  private togglePanel(): void {
    const open = this.panel.dataset.open === "true";
    this.panel.dataset.open = open ? "false" : "true";
    this.panel.hidden = open;
    this.toggle.setAttribute("aria-expanded", String(!open));
  }

  private byId<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing settings element #${id}`);
    return element as T;
  }
}

export function readQualityPreference(): QualityPreference {
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "low" || value === "medium" || value === "high"
    ? value
    : "auto";
}
