import type { CRTOptions, PhosphorStyle } from 'crt-fx';

/** Effect definitions for building UI controls */
interface EffectDef {
  name: string;
  key: keyof CRTOptions;
  sliders: SliderDef[];
  dropdowns?: DropdownDef[];
}

interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

interface DropdownDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue: string;
}

const PHOSPHOR_STYLES: { value: PhosphorStyle; label: string }[] = [
  { value: 'shadow-mask', label: 'Shadow Mask' },
  { value: 'aperture-grille', label: 'Aperture Grille (Trinitron)' },
  { value: 'slot-mask', label: 'Slot Mask' },
  { value: 'cromaclear', label: 'Cromaclear (NEC)' },
  { value: 'pvm', label: 'PVM (Broadcast)' },
  { value: 'arcade', label: 'Arcade' },
  { value: 'vga', label: 'VGA (90s PC)' },
  { value: 'composite', label: 'Composite (Cheap TV)' },
  { value: 'mono-green', label: 'Mono Green' },
  { value: 'mono-amber', label: 'Mono Amber' },
];

const EFFECT_DEFS: EffectDef[] = [
  {
    name: 'Curvature',
    key: 'curvature',
    sliders: [
      { key: 'amount', label: 'Amount', min: 0, max: 0.1, step: 0.001, defaultValue: 0.02 },
    ],
  },
  {
    name: 'Color Bleed',
    key: 'colorBleed',
    sliders: [
      { key: 'amount', label: 'Amount', min: 0, max: 0.02, step: 0.001, defaultValue: 0.003 },
      { key: 'direction', label: 'Direction', min: 0, max: 1, step: 1, defaultValue: 0 },
    ],
  },
  {
    name: 'Chromatic Aberration',
    key: 'chromatic',
    sliders: [
      { key: 'offset', label: 'Offset', min: 0, max: 10, step: 0.1, defaultValue: 2.0 },
      { key: 'angle', label: 'Angle', min: 0, max: 360, step: 1, defaultValue: 0 },
    ],
  },
  {
    name: 'Phosphor',
    key: 'phosphor',
    sliders: [
      { key: 'scale', label: 'Scale', min: 0.5, max: 4, step: 0.1, defaultValue: 1.0 },
      { key: 'intensity', label: 'Intensity', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    ],
    dropdowns: [
      { key: 'style', label: 'Style', options: PHOSPHOR_STYLES, defaultValue: 'shadow-mask' },
    ],
  },
  {
    name: 'Scanlines',
    key: 'scanlines',
    sliders: [
      { key: 'intensity', label: 'Intensity', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
      { key: 'count', label: 'Count', min: 100, max: 2000, step: 10, defaultValue: 800 },
      { key: 'sharpness', label: 'Sharpness', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
    ],
  },
  {
    name: 'Noise',
    key: 'noise',
    sliders: [
      { key: 'intensity', label: 'Intensity', min: 0, max: 0.3, step: 0.005, defaultValue: 0.05 },
      { key: 'flickerIntensity', label: 'Flicker', min: 0, max: 0.2, step: 0.005, defaultValue: 0.03 },
      { key: 'speed', label: 'Speed', min: 0.1, max: 5, step: 0.1, defaultValue: 1.0 },
    ],
  },
  {
    name: 'Bloom',
    key: 'bloom',
    sliders: [
      { key: 'radius', label: 'Radius', min: 1, max: 12, step: 1, defaultValue: 4 },
      { key: 'strength', label: 'Strength', min: 0, max: 1, step: 0.01, defaultValue: 0.3 },
      { key: 'threshold', label: 'Threshold', min: 0, max: 1, step: 0.01, defaultValue: 0.7 },
    ],
  },
  {
    name: 'Vignette',
    key: 'vignette',
    sliders: [
      { key: 'strength', label: 'Strength', min: 0, max: 1, step: 0.01, defaultValue: 0.3 },
      { key: 'radius', label: 'Radius', min: 0.2, max: 1.2, step: 0.01, defaultValue: 0.8 },
    ],
  },
];

export type OnChangeCallback = (options: CRTOptions) => void;

export class ControlsUI {
  private container: HTMLElement;
  private onChange: OnChangeCallback;
  private state: Record<string, Record<string, any>> = {};
  private enabledState: Record<string, boolean> = {};
  private valueLabels: Map<string, HTMLSpanElement> = new Map();
  private sliderInputs: Map<string, HTMLInputElement> = new Map();
  private toggleInputs: Map<string, HTMLInputElement> = new Map();
  private selectInputs: Map<string, HTMLSelectElement> = new Map();

  constructor(container: HTMLElement, onChange: OnChangeCallback) {
    this.container = container;
    this.onChange = onChange;
    this.initState();
    this.build();
  }

  private initState(): void {
    for (const def of EFFECT_DEFS) {
      this.enabledState[def.key] = false;
      this.state[def.key] = {};
      for (const s of def.sliders) {
        this.state[def.key][s.key] = s.defaultValue;
      }
      if (def.dropdowns) {
        for (const d of def.dropdowns) {
          this.state[def.key][d.key] = d.defaultValue;
        }
      }
    }
  }

  private build(): void {
    this.container.innerHTML = '';

    for (const def of EFFECT_DEFS) {
      const section = document.createElement('div');
      section.className = 'control-section';

      // Header with toggle + collapsible
      const header = document.createElement('div');
      header.className = 'section-header';

      const left = document.createElement('div');
      left.className = 'toggle-wrapper';

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.className = 'toggle-switch';
      toggle.checked = this.enabledState[def.key];
      this.toggleInputs.set(def.key, toggle);

      toggle.addEventListener('change', () => {
        this.enabledState[def.key] = toggle.checked;
        this.emitChange();
      });

      const title = document.createElement('h3');
      title.textContent = def.name;

      left.appendChild(toggle);
      left.appendChild(title);

      const arrow = document.createElement('span');
      arrow.className = 'section-toggle';
      arrow.textContent = '▼';

      header.appendChild(left);
      header.appendChild(arrow);

      // Body
      const body = document.createElement('div');
      body.className = 'section-body';

      let collapsed = false;
      header.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('toggle-switch')) return;
        collapsed = !collapsed;
        body.classList.toggle('collapsed', collapsed);
        arrow.classList.toggle('collapsed', collapsed);
      });

      // Dropdowns
      if (def.dropdowns) {
        for (const dd of def.dropdowns) {
          const row = document.createElement('div');
          row.className = 'dropdown-row';

          const label = document.createElement('label');
          label.textContent = dd.label;

          const select = document.createElement('select');
          for (const opt of dd.options) {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
          }
          select.value = dd.defaultValue;
          const selectKey = `${def.key}.${dd.key}`;
          this.selectInputs.set(selectKey, select);

          select.addEventListener('change', () => {
            this.state[def.key][dd.key] = select.value;
            this.emitChange();
          });

          row.appendChild(label);
          row.appendChild(select);
          body.appendChild(row);
        }
      }

      // Sliders
      for (const s of def.sliders) {
        const row = document.createElement('div');
        row.className = 'slider-row';

        const label = document.createElement('label');
        label.textContent = s.label;

        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(s.min);
        input.max = String(s.max);
        input.step = String(s.step);
        input.value = String(s.defaultValue);

        const valueSpan = document.createElement('span');
        valueSpan.className = 'slider-value';
        valueSpan.textContent = formatValue(s.defaultValue, s.step);

        const sliderKey = `${def.key}.${s.key}`;
        this.sliderInputs.set(sliderKey, input);
        this.valueLabels.set(sliderKey, valueSpan);

        input.addEventListener('input', () => {
          const val = parseFloat(input.value);
          this.state[def.key][s.key] = val;
          valueSpan.textContent = formatValue(val, s.step);
          this.emitChange();
        });

        row.appendChild(label);
        row.appendChild(input);
        row.appendChild(valueSpan);
        body.appendChild(row);
      }

      section.appendChild(header);
      section.appendChild(body);
      this.container.appendChild(section);
    }
  }

  private emitChange(): void {
    const options: CRTOptions = {};
    for (const def of EFFECT_DEFS) {
      if (this.enabledState[def.key]) {
        (options as any)[def.key] = { ...this.state[def.key], enabled: true };
      }
    }
    this.onChange(options);
  }

  /** Apply a preset configuration to the UI */
  applyPreset(preset: CRTOptions): void {
    // First disable everything
    for (const def of EFFECT_DEFS) {
      this.enabledState[def.key] = false;
    }

    // Apply preset values
    for (const [key, val] of Object.entries(preset)) {
      if (!val || typeof val !== 'object') continue;
      this.enabledState[key] = true;

      for (const [param, value] of Object.entries(val as Record<string, any>)) {
        if (this.state[key]) {
          this.state[key][param] = value;
        }
      }
    }

    // Update all UI elements
    this.syncUI();
    this.emitChange();
  }

  /** Reset all to defaults */
  reset(): void {
    this.initState();
    this.syncUI();
    this.emitChange();
  }

  /** Sync UI elements to current state */
  private syncUI(): void {
    for (const def of EFFECT_DEFS) {
      // Toggle
      const toggle = this.toggleInputs.get(def.key);
      if (toggle) toggle.checked = this.enabledState[def.key];

      // Sliders
      for (const s of def.sliders) {
        const sliderKey = `${def.key}.${s.key}`;
        const input = this.sliderInputs.get(sliderKey);
        const label = this.valueLabels.get(sliderKey);
        const val = this.state[def.key]?.[s.key] ?? s.defaultValue;
        if (input) input.value = String(val);
        if (label) label.textContent = formatValue(val, s.step);
      }

      // Dropdowns
      if (def.dropdowns) {
        for (const dd of def.dropdowns) {
          const selectKey = `${def.key}.${dd.key}`;
          const select = this.selectInputs.get(selectKey);
          const val = this.state[def.key]?.[dd.key] ?? dd.defaultValue;
          if (select) select.value = val;
        }
      }
    }
  }

  /** Get current full options */
  getCurrentOptions(): CRTOptions {
    const options: CRTOptions = {};
    for (const def of EFFECT_DEFS) {
      if (this.enabledState[def.key]) {
        (options as any)[def.key] = { ...this.state[def.key] };
      }
    }
    return options;
  }
}

function formatValue(val: number, step: number): string {
  if (step >= 1) return String(Math.round(val));
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return val.toFixed(Math.min(decimals, 3));
}

/** Setup drag and drop on the drop zone */
export function setupDragDrop(
  zone: HTMLElement,
  overlay: HTMLElement,
  onFile: (file: File) => void,
): void {
  let dragCounter = 0;

  zone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    zone.classList.add('drag-over');
    overlay.classList.remove('hidden');
  });

  zone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      zone.classList.remove('drag-over');
    }
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    zone.classList.remove('drag-over');

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onFile(file);
      }
    }
  });
}

/** Populate the preset select element */
export function populatePresets(
  select: HTMLSelectElement,
  presets: Record<string, CRTOptions>,
): void {
  for (const name of Object.keys(presets)) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
    select.appendChild(option);
  }
}
