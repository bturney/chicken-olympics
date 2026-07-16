import {
  FIELDS,
  SECTIONS,
  type PlaytestMenuState,
} from "../match/playtestMenuManager";

export interface PlaytestTuningFormActions {
  onFieldChange(index: number, value: string): void;
  onFieldFocus(index: number): void;
  onApply(): void;
  onRestartMatch(): void;
  onResetDraft(): void;
  onStageDefaults(): void;
  onClose(): void;
}

/** Native controls keep browser focus, selection, and keyboard behavior intact. */
export class PlaytestTuningForm {
  private readonly root: HTMLFormElement;
  private readonly inputs: HTMLInputElement[] = [];
  private readonly errors: HTMLElement[] = [];
  private readonly applyButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly actions: PlaytestTuningFormActions,
  ) {
    const host = canvas.parentElement ?? document.body;
    host.style.position = "relative";

    this.root = document.createElement("form");
    this.root.dataset.playtestTuning = "";
    this.root.setAttribute("aria-label", "Playtest Tuning");
    this.root.addEventListener("submit", (event) => event.preventDefault());
    this.root.addEventListener("keydown", (event) => {
      if (event.key === "Escape" || event.key === "`" || event.key === "~") {
        event.preventDefault();
        this.actions.onClose();
      }
      if (event.key === " " && event.target instanceof HTMLButtonElement) {
        // Phaser captures keyboard events before the browser can synthesize this click.
        event.preventDefault();
        event.target.click();
      }
      event.stopPropagation();
    });
    const styles = document.createElement("style");
    styles.textContent = FORM_STYLE;
    this.root.append(styles);
    host.append(this.root);

    const header = document.createElement("header");
    header.innerHTML = "<h1>Playtest Tuning</h1><p>* Restart required</p>";
    this.root.append(header);

    for (const section of SECTIONS) {
      const fieldset = document.createElement("fieldset");
      const legend = document.createElement("legend");
      legend.textContent = section;
      fieldset.append(legend);

      FIELDS.forEach((field, index) => {
        if (field.section !== section) return;
        const row = document.createElement("label");
        row.className = "playtest-tuning-field";
        row.htmlFor = `playtest-tuning-${field.key}`;
        const name = document.createElement("span");
        name.textContent = `${field.label}${field.restartRequired ? " *" : ""}`;
        const input = document.createElement("input");
        input.id = `playtest-tuning-${field.key}`;
        input.name = field.key;
        input.type = "text";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.addEventListener("input", () =>
          this.actions.onFieldChange(index, input.value),
        );
        input.addEventListener("focus", () => this.actions.onFieldFocus(index));
        const hint = document.createElement("small");
        hint.textContent = field.unitHint;
        const error = document.createElement("output");
        error.className = "playtest-tuning-error";
        error.setAttribute("aria-live", "polite");
        row.append(name, input, hint, error);
        fieldset.append(row);
        this.inputs[index] = input;
        this.errors[index] = error;
      });
      this.root.append(fieldset);
    }

    const actionBar = document.createElement("footer");
    this.applyButton = this.createButton("Apply", () => this.actions.onApply());
    this.restartButton = this.createButton("Restart Match With Tuning", () =>
      this.actions.onRestartMatch(),
    );
    actionBar.append(
      this.applyButton,
      this.restartButton,
      this.createButton("Reset Draft", () => this.actions.onResetDraft()),
      this.createButton("Defaults / Clear Saved", () =>
        this.actions.onStageDefaults(),
      ),
      this.createButton("Close", () => this.actions.onClose()),
    );
    this.root.append(actionBar);
  }

  render(state: PlaytestMenuState): void {
    for (let index = 0; index < FIELDS.length; index++) {
      const input = this.inputs[index];
      const error = this.errors[index];
      if (!input || !error) continue;
      if (input.value !== state.fieldValues[index]) {
        input.value = state.fieldValues[index] ?? "";
      }
      const message = state.errors
        .filter((item) => item.field === FIELDS[index]!.key)
        .map((item) => item.message)
        .join("; ");
      error.textContent = message;
      input.setAttribute("aria-invalid", String(message.length > 0));
    }
    const blocked = state.errors.length > 0;
    this.applyButton.dataset.invalid = String(blocked);
    this.restartButton.dataset.invalid = String(blocked);
  }

  destroy(): void {
    this.root.remove();
  }

  private createButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }
}

const FORM_STYLE = `
  [data-playtest-tuning] { position: absolute; inset: 0; z-index: 1000; overflow: auto;
  padding: clamp(1rem, 3vw, 3rem); color: #f8f7ff; background: rgb(12 15 35 / 96%);
  font: 16px/1.35 system-ui, sans-serif; }
  [data-playtest-tuning] h1 { color: #ffdd44; font-size: clamp(1.5rem, 3vw, 2.25rem); }
  [data-playtest-tuning] header p { color: #ffb36b; margin: .25rem 0 1.25rem; }
  [data-playtest-tuning] fieldset { border: 1px solid #5577bb; margin: 0 0 1rem; padding: 1rem; }
  [data-playtest-tuning] legend { color: #bcd6ff; font-weight: 700; padding: 0 .35rem; }
  [data-playtest-tuning] .playtest-tuning-field { display: grid; grid-template-columns: minmax(12rem, 1fr) minmax(14rem, 2fr) minmax(9rem, 1fr); gap: .35rem .75rem; align-items: center; margin: .55rem 0; }
  [data-playtest-tuning] input { width: 100%; min-width: 0; padding: .5rem .6rem; color: inherit; background: #1e2548; border: 2px solid #6382c2; border-radius: .25rem; font: inherit; }
  [data-playtest-tuning] input[aria-invalid="true"] { border-color: #ff5b5b; }
  [data-playtest-tuning] input:focus-visible, [data-playtest-tuning] button:focus-visible { outline: 3px solid #ffdd44; outline-offset: 3px; box-shadow: 0 0 10px 3px rgb(255 221 68 / 72%); }
  [data-playtest-tuning] small { color: #b5bdd3; }
  [data-playtest-tuning] .playtest-tuning-error { grid-column: 2 / -1; min-height: 1.15em; color: #ff7b7b; font-size: .875rem; }
  [data-playtest-tuning] footer { display: flex; flex-wrap: wrap; gap: .75rem; padding: .5rem 0; }
  [data-playtest-tuning] button { padding: .65rem .9rem; color: #fff; background: #334d93; border: 2px solid #7999e1; border-radius: .3rem; font: inherit; cursor: pointer; }
  [data-playtest-tuning] button:hover { background: #4564b8; }
  [data-playtest-tuning] button[data-invalid="true"] { opacity: .55; }
  @media (max-width: 700px) { [data-playtest-tuning] .playtest-tuning-field { grid-template-columns: 1fr; } [data-playtest-tuning] .playtest-tuning-error { grid-column: 1; } }
`;
