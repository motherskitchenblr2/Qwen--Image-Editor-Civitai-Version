# Phase 4: Modern Two-Column Studio Workspace & Interactive Canvas

> **Timeline:** October 2026  
> **Status:** ✅ Completed & Fully Verified  
> **Focus:** Two-Column Split-Pane Studio, Interactive Curtain Wipe, HTML5 Inpaint Layer Masking, Multi-LoRA Stacking, Adaptive Slider Calibration

---

## 1. Phase Objective & UX Audit

A rigorous user experience and information architecture audit revealed critical usability friction in the initial studio design:
1. **Vertical Scroll Exhaustion**: The settings panel, prompt boxes, LoRA controls, and generation buttons were stacked vertically above the canvas. Users had to repeatedly scroll up and down between tweaking parameters and reviewing the generated output.
2. **Sliders Inverted & Locked at 1**: True-CFG Scale, Guidance Scale, and Inference Steps all initialized to `1.0`, producing corrupted, degraded images for non-distilled models.
3. **LoRA Clutter & Duplication**: The LoRA selector was a single raw `<select>` dropdown rendering truncated raw filenames, while all 27 cached LoRAs were printed a second time in a massive list beneath the canvas.
4. **Weak Primary Action Hierarchy**: The main trigger (`Apply Image Edit`) visually blended into secondary helpers (`Enhance`, `Seed`).
5. **Passive Canvas**: The preview area was static display-only with basic Result/Original buttons, lacking inpainting, split comparison, or aspect-ratio presets.

---

## 2. Mandatory Safety Protocol Executed

Before any code refactoring commenced:
1. Created an emergency git baseline branch: `backup/pre-studio-redesign-stable` at commit `fa7b15b`.
2. Created and checked out the active feature branch: `feature/studio-modern-redesign`.
3. Established zero-breakage constraint: All existing API contracts (`/api/edit`, `/api/generate`, `/api/sentinel/*`, `/api/tunnel`) and all 57 automated tests had to remain 100% passing.

---

## 3. Architecture Decomposed & Components Delivered

```mermaid
flowchart TD
    subgraph StudioLayout["StudioLayout.tsx (Two-Column Desktop Grid)"]
        subgraph LeftPanel["Left Control Sidebar (440px - 480px)"]
            MODE["Segmented Mode Switch: Generate vs. Edit"]
            MODELS["Live Provider & Model Selector"]
            PROMPTS["Prompt & Negative Editors + Consolidated Action Toolbar"]
            LORA_STACK["Active LoRA Stack Chips (Max 3) + Manage Hub Button"]
            SLIDERS["Calibrated Adaptive Sliders (Steps / CFG / Guidance / Seed)"]
            CTA["⚡ Prominent Primary Action Button (Electric Neon Glow)"]
        end

        subgraph RightPanel["Right Canvas Workspace (flex-1 min-w-0)"]
            VIEW_BAR["View Mode: Split Wipe | Result | Original | Opacity Blend"]
            STAGE["Interactive Canvas Viewport (Zoom / Aspect Guides)"]
            INPAINT["🖌️ HTML5 Inpaint Mask Brush Layer (Undo/Invert/Alpha Export)"]
            WIPE["‹› Draggable Split Curtain Divider Handle"]
            DOCK["Floating Utility Dock (Refine / Copy / Download)"]
            RIBBON["Session History Ribbon (Horizontal 1-Click Rollback Strip)"]
        end
    end

    MODE --> CTA
    PROMPTS --> CTA
    SLIDERS --> CTA
    LORA_STACK --> CTA
    CTA --> STAGE
    STAGE --> WIPE
    STAGE --> INPAINT
    STAGE --> DOCK
    STAGE --> RIBBON
```

### Component 1: `StudioLayout.tsx`
- Responsive 2-column desktop grid (`lg:grid-cols-[440px_1fr] xl:grid-cols-[480px_1fr]`).
- Left column scrolls smoothly with hidden scrollbars; right column flex-grows to maximize viewport real estate.
- Gracefully degrades to a single stacked column on mobile devices (`< 1024px`) with zero horizontal overflow.

### Component 2: `ControlPanel.tsx`
- **Segmented Mode Toggle**: Equal-sized buttons for `🎨 Generate Image` and `✨ Edit Image`.
- **Consolidated Prompt Toolbar**: Integrated Brain-Storm, Prompt Enhance, Inspire, and Smart-Negative directly into the prompt header.
- **Model-Calibrated Adaptive Sliders**:
  - Automatically calibrates parameters upon model selection:
    - **Distilled / Turbo / Viggle / Schnell**: Steps: `4–6`, CFG: `1.0`, Guidance: `1.0–1.5`, Rapid presets (`4`, `6`, `8`, `12`).
    - **Standard Diffusion / SDXL / Qwen Base / Cloud**: Steps: `25`, CFG: `6.0`, Guidance: `5.0`, Standard presets (`15`, `20`, `25`, `30`).
- **Prominent Primary CTA**: Full-width high-contrast electric gradient button (`animate-neon-button`) with step counters, elapsed timers, and emergency Cloud fallback if generation takes >45s.

### Component 3: `CanvasWorkspace.tsx`
- **Interactive Split Curtain Wipe Slider**:
  - Real-time before/after comparison with a draggable vertical divider handle (`‹›`).
  - Supports mouse and touch dragging across the canvas (0% to 100%).
- **HTML5 Inpaint Masking Layer**:
  - Overlaid canvas synced with the image's `naturalWidth` and `naturalHeight`.
  - Adjustable brush radius (`6px` to `70px`), rounded stroke joints (`lineCap = "round"`), undo history stack, mask inversion, and binary alpha mask export passed to `/api/edit`.
- **Zoom & Pan Controls**: 50%, 75%, 100%, 150%, 200%, and Fit to Screen.
- **Aspect Ratio Guides**: 1:1 (Square), 16:9 (Landscape), 9:16 (Stories/Shorts), 4:5 (Social).
- **Utility Dock**: 1-click "Refine" (send result to input for iterative editing), Copy to Clipboard, and Download PNG.

### Component 4: `LoraModal.tsx`
- Replaced the single `<select>` dropdown and eliminated the redundant 27-item list below the old canvas.
- Features search bar, category badges (SDXL, Flux, Qwen, Style, Character), size metrics, and trigger words preview.
- **1-Click Trigger Word Injection**: Appends required trigger tokens directly into the prompt box.
- **Multi-LoRA Stacking**: Combines up to 3 LoRAs simultaneously with individual weight sliders (`0.0` to `1.5`).

### Component 5: `HistoryRibbon.tsx`
- Horizontal thumbnail strip at the bottom of the studio displaying recent generation outputs.
- Hover overlay with 1-click **View** (load to canvas) and 1-click **Branch / Refine** (send as input image for the next edit iteration).

---

## 4. Bugs, Failures & Root Cause Analyses

### ❌ Bug 4.1: Vertical Layout Friction & Scrolling Fatigue
- **Symptom:** Users had to scroll down 600px to see the image result, then scroll back up to alter the prompt or steps.
- **Root Cause:** A single-column vertical layout (`grid-cols-12` stacked vertically on medium screens) with fixed aspect ratios.
- **Fix Applied:**
  - Transitioned to the desktop split-pane (`StudioLayout.tsx`). The controls stay fixed and accessible on the left while the canvas stays in view on the right at all times.

### ❌ Bug 4.2: Inference Sliders Locked at 1.0 Default
- **Symptom:** When users switched between Turbo and SDXL models, the sliders stayed locked at `1.0` CFG and `1` step, causing diffusion models to output pure noise or black images.
- **Root Cause:** Hardcoded static initial state (`useState(1.0)`) without model-change awareness.
- **Fix Applied:**
  - Implemented `applyModelCalibratedDefaults(modelId)` in `ControlPanel.tsx`, which dynamically inspects model architecture tags and applies calibrated step/CFG profiles upon every model switch.

### ❌ Bug 4.3: Duplicate 27-LoRA List Cluttering DOM
- **Symptom:** All 27 LoRAs were rendered twice in the page: once inside the native `<select>` dropdown, and again in a 380px vertical scroll container on the right, consuming viewport space.
- **Root Cause:** Redundant component duplication in `app/page.tsx`.
- **Fix Applied:**
  - Consolidated all LoRA operations into `LoraModal.tsx`. The main control panel now displays compact chips for only the active stacked LoRAs (up to 3).

### ❌ Bug 4.4: Inpaint Mask Coordinate Mismatch
- **Symptom:** Painting a mask on an image resized by CSS caused the inpainting mask to be offset or stretched relative to the real image.
- **Root Cause:** Drawing directly on a canvas sized to DOM `clientWidth`/`clientHeight` instead of the image's `naturalWidth`/`naturalHeight`.
- **Fix Applied:**
  - Sized the canvas dynamically to `image.naturalWidth` and `image.naturalHeight`.
  - Applied coordinate transformation scaling:
    ```typescript
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
    ```

---

## 5. Verification & Milestone Acceptance

- [x] **Zero TypeScript Errors**: `npm run typecheck` exited with code 0.
- [x] **Automated Test Suite**: All 57 tests passing across 7 test suites (`npm test`).
- [x] **Production Build**: `npm run build` compiled 12/12 routes cleanly with Next.js 15.5.
- [x] **Code Reduction**: Decoupled `app/page.tsx` by over 650 lines of monolithic code into clean, isolated modules.
- [x] **Git Checkpoint**: Committed to `feature/studio-modern-redesign` under hash `4256ecb`.

---

## 6. Studio Polish Pass & Viewport Optimization

### 6.1 Expanded Empty State Canvas Dropzone
- **Component**: `CanvasWorkspace.tsx`
- **Enhancement**: Replaced compact empty placeholder with an expanded, high-visibility dashed dropzone (`max-w-xl h-80 border-2 border-dashed border-slate-700/80 rounded-2xl bg-slate-900/40 hover:border-cyan-500/50 hover:bg-slate-900/60 transition-all cursor-pointer`) giving users an immediate, tactile drag-and-drop target.

### 6.2 Primary CTA Accessibility & Visual Hierarchy
- **Component**: `ControlPanel.tsx`
- **Enhancements**:
  - **Electric Gradient**: Enabled state styled with `bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/20 active:scale-[0.99]`.
  - **Contextual Tooltip & Helper Note**: When in Edit mode with no image uploaded, the button displays a native `title="Upload an image to enable editing"` tooltip alongside a subtle helper message (`<p className="text-[11px] text-slate-400 text-center font-medium">Upload an image to enable editing</p>`).

### 6.3 Independent Left Sidebar Scroll (Stationary Canvas)
- **Component**: `StudioLayout.tsx`
- **Enhancement**: Applied `w-full h-[calc(100vh-64px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-2 pb-8 flex flex-col gap-4` to the left `<aside>`. This allows the user to scroll through complex model settings, LoRAs, and prompt parameters while the right canvas workspace remains anchored and stationary in the desktop viewport.

---

## 7. Responsive Visual Density & Mobile Overhaul (UI/UX Pro Max Amezing Tier)

### 7.1 Desktop-First Side-by-Side Workspace
- **Container**: `w-full min-h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-[440px_1fr] xl:grid-cols-[480px_1fr] gap-6 px-4 lg:px-8 py-4 overflow-hidden`
- **Left Sidebar**: `lg:h-[calc(100vh-80px)] lg:overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 pb-24 lg:pb-8`
- **Right Canvas Workspace**: `flex flex-col h-full min-h-[360px] lg:min-h-[500px] lg:h-[calc(100vh-80px)] min-w-0 gap-4 overflow-hidden`
- **Dropzone Viewport**: Polished empty-state upload container (`w-full max-w-xl h-80 border-2 border-dashed border-slate-700/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/40 hover:border-cyan-500/50 hover:bg-slate-900/60 transition-all cursor-pointer`)

### 7.2 Mobile Overhaul (<1024px Screens)
- **Visual Re-ordering**:
  - Interactive Canvas placed on top (`order-1 lg:order-2`) so mobile users immediately see their uploaded/edited artwork without scrolling.
  - Controls placed below canvas (`order-2 lg:order-1`).
- **Collapsible Accordion for Advanced Parameters & Sliders**:
  - Main prompt, negative prompt, mode switcher, and live AI model selector remain permanently accessible.
  - LoRA stacking (chips, weight sliders, fuse/unload), CFG Scale, Guidance Scale, Inference Steps presets, and Seed are consolidated into a clean, collapsible accordion (`⚙️ Advanced Parameters & Sliders`) on mobile.
  - Automatically expanded on desktop (`lg:block`).
- **Sticky Bottom Action Bar**:
  - Primary CTA ("Apply Image Edit" / "Generate") is pinned to the bottom of the mobile viewport (`fixed bottom-0 left-0 right-0 p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 z-50 lg:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.85)]`).
  - Scrollable container provides `pb-24` padding so bottom content is never obscured by the fixed bar.
  - Real-time generation progress bar, elapsed timer, and Cloud fallback switch are embedded directly into the sticky bar during active inference.

---

## 8. Unified Navbar, Aligned Workspace Baselines & Expanded Dropzone (UI/UX Pro Max Refinement)

### 8.1 Unified Edge-to-Edge Navbar Refactor
- **Component**: `app/page.tsx`
- **Brand Identity**:
  - Left-anchored brand icon + Title (`Qwen Image Editor Studio`) with gradient typography.
  - Subtitle badge: `Dual Tesla T4 • 5 TB Vault`.
- **Navigation Controls**:
  - Center desktop segmented control containing all 5 primary tabs: `Studio & Editor`, `AI Generators` (with NEW badge), `Civitai LoRA Hub` (with dynamic LoRA count badge), `Gallery` (with count badge), and `Sentinel`.
  - Mobile hamburger drawer (`<1024px`) with intuitive grid of quick tab buttons (`isMobileNavOpen`).
- **System Status Cluster**:
  - Single unified GPU toggle button:
    - Online: emerald glowing badge with pulsing live ping indicator and hover-to-stop (`GPU Online` -> `Turn Off`).
    - Booting: amber spinning refresh indicator (`Booting GPU...` -> `Halting...`).
    - Offline: compact amber indicator with click-to-start action (`⚡ GPU Offline • Turn On`).
  - Sleek Theme Toggle: `NIGHT` / `DAY NEO` with Sun/Moon icons.
  - One-tap SFW Safety Toggle: `🛡️ SFW SAFE` / `🔞 NSFW ON`.
  - Eliminated redundant `Vault: 5.0 TiB` badge to eliminate visual clutter.

### 8.2 Top-Edge Workspace Alignment
- **Components**: `StudioLayout.tsx`, `ControlPanel.tsx`, `CanvasWorkspace.tsx`
- **Symmetric Baseline**:
  - Both Left and Right columns start at the exact same horizontal horizon directly below the header.
  - Studio Mode Switch on the left (`🎨 Generate Image` / `✨ Edit Image`) and Canvas Utility Toolbar on the right (`[Split Wipe] [Result] [Original] [Blend] | 1:1, 16:9...`) standardized to identical `h-12 min-h-[48px]` heights with matching `border-cyan-500/35 rounded-2xl` aesthetics.
  - Removed asymmetrical top padding and offset containers.

### 8.3 Expanded Interactive Canvas Dropzone
- **Component**: `CanvasWorkspace.tsx`
- **Empty State Enhancement**:
  - Replaced small placeholder with a generous, immersive dashed dropzone: `w-full max-w-2xl h-[420px] border-2 border-dashed border-slate-700/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/30 hover:border-cyan-500/50 hover:bg-slate-900/50 transition-all cursor-pointer p-6 text-center group/drop`.
  - Added dedicated upload icon, clear file format helper (`Supported formats: PNG, JPG, WebP (up to 10MB)`), and prominent `Browse or Drag Image Here` button with cyan gradient.

---

## 9. Viewport Lock (100dvh) & Canvas Auto-Centering (Studio Workspace Final Polish)

### 9.1 Lock Workspace to Dynamic Viewport Height (100dvh)
- **Component**: `StudioLayout.tsx` & `app/page.tsx`
- **Enhancement**:
  - Replaced loose `min-h-[...]` with strict viewport clamp:
    `h-[calc(100dvh-64px)] w-full grid grid-cols-1 lg:grid-cols-[440px_1fr] xl:grid-cols-[480px_1fr] overflow-hidden px-4 py-2 gap-4`
  - In `app/page.tsx`: Set `h-[100dvh] max-h-[100dvh] overflow-hidden` when in studio tab and `shrink-0` on header to guarantee zero outer window scrolling.
  - Guarantees neither the page nor the right panel vertically stretches past the screen boundary at 100%, 62%, or high-DPI zoom levels.
- **Left Sidebar**:
  - `w-full order-2 lg:order-1 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-2 space-y-4 pb-8`

### 9.2 Canvas Stage Auto-Centering & Sizing
- **Component**: `CanvasWorkspace.tsx`
- **Enhancement**:
  - Root container: `h-full flex flex-col justify-between overflow-hidden bg-[#050811] rounded-xl border border-slate-800/60 select-none`.
  - Canvas stage viewport: `flex-1 min-h-0 relative overflow-hidden flex items-center justify-center p-6 shadow-[inset_0_0_50px_rgba(0,0,0,0.85)] group`.
  - Dropzone card sizing: `w-full max-w-md p-6 border-2 border-dashed border-slate-700/80 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-900/40 hover:border-cyan-500/60 transition-all cursor-pointer`.
  - History ribbon hugs the bottom of the viewport directly below the canvas stage without generating empty black dead space.

---

## 10. Mobile Visual Polish & Touch Ergonomics

### 10.1 Top Canvas Safe-Area Padding
- **Component**: `CanvasWorkspace.tsx`
- **Enhancement**: Added safe-area padding (`pt-2 px-3 sm:px-4`) to the canvas header toolbar. Prevents the view mode buttons (`[Split Wipe] [Result] [Original]`) and zoom controls from brushing directly against the top viewport edge on mobile browsers.

### 10.2 Compact Collapsible Session History on Mobile (<1024px)
- **Component**: `HistoryRibbon.tsx`
- **Enhancement**:
  - Implemented `isMobileExpanded` collapsible toggle bar on mobile:
    `border-t border-b border-slate-800/60 py-1.5 px-3 text-xs flex items-center justify-between bg-black/60 rounded-lg`
  - Replaces the full vertical thumbnail gallery by default on mobile screens, displaying a single-line summary with output count and expand/collapse chevron.
  - Prevents thumbnail rows from pushing the prompt editor and controls off-screen on small mobile viewports.
  - Fully expanded by default on desktop (`>=1024px`).

### 10.3 Bottom CTA Helper Contrast & Legibility
- **Component**: `ControlPanel.tsx`
- **Enhancement**:
  - Elevated "Upload an image to enable editing" helper note from low-visibility `text-[11px]` to `text-slate-400 text-xs font-medium text-center` for crisp readability on mobile OLED screens.

---

## 11. Mobile Portrait Refinement: Header Headroom, Session History Reordering & High-Contrast Typography

### 11.1 Top Canvas Header Spacing (`CanvasWorkspace.tsx`)
- **Root Cause**: On mobile portrait viewports with notch cutouts, dynamic islands, or browser URL address bars, toolbar controls (`[Result] [Original]`, zoom toggles) were touching the top border of the canvas wrapper.
- **Resolution**:
  - Replaced fixed `min-h-[48px] h-12 pt-2 px-3 sm:px-4` with dynamic `min-h-[50px] pt-3 px-3 pb-1 sm:px-4`.
  - Provides 12px of top breathing room (`pt-3`) and 4px bottom padding (`pb-1`), preventing touch target collisions and eliminating status bar bleed.

### 11.2 Mobile Session History Reordering (`StudioLayout.tsx`)
- **Root Cause**: In the mobile single-column DOM structure, `<main>` (`order-1`) rendered both `{canvasWorkspace}` and `{historyRibbon}` before `<aside>` (`order-2`, `{controlPanel}`). This caused the initial "Session History - 0 Items" bar to sit awkwardly wedged between the image canvas and the `Generate / Edit` mode toggle.
- **Resolution**:
  - Separated the mobile and desktop display slots of `{historyRibbon}`:
    - **Desktop (`hidden lg:block`)**: Remains at the bottom of `<main>` beneath `{canvasWorkspace}`.
    - **Mobile (`lg:hidden`)**: Rendered inside `<aside>` beneath `{controlPanel}` (`pt-3 border-t border-slate-800/60`).
  - Increased mobile aside bottom padding to `pb-28 lg:pb-8` so the reordered history bar and controls scroll cleanly above the sticky mobile action dock with zero overlap.
  - As a result, on mobile portrait viewports, the `Generate / Edit` mode switcher and prompt box sit directly beneath the canvas dropzone without any intervening dividers.

### 11.3 High-Contrast CTA Helper Subtext & History Metadata
- **Components**: `ControlPanel.tsx`, `HistoryRibbon.tsx`
- **Resolution**:
  - Ensured the disabled helper text `"Upload an image to enable editing"` is explicitly styled with `text-slate-400 text-xs font-medium text-center` in both the desktop action container and the sticky mobile bottom dock.
  - Upgraded the empty session history subtext in `HistoryRibbon.tsx` from `text-slate-500` to `text-slate-400 font-medium` to ensure WCAG AA compliant contrast against the deep `#050811` OLED theme.

---

## 12. Viewport-Frozen Navigation Header Bar & Document Flow Preservation

### 12.1 Header Freezing (`app/page.tsx`)
- **Root Cause**:
  - The previous header utilized `position: sticky; top: 0;`.
  - In CSS, `position: sticky` fails to stick to the viewport whenever parent or ancestor elements (`html, body`) have `overflow-x: hidden` or an internal overflow clipping context, which is common in mobile Chromium and WebKit.
  - In views where page content scrolls vertically (Gallery, LoRA Hub, AI Generators, Sentinel, and mobile Studio), the header was moving upward with the scroll instead of staying locked at the top of the viewport.
- **Resolution**:
  - Converted the header from `sticky top-0` to `fixed top-0 left-0 right-0 z-50`.
  - Added a matching flow spacer directly beneath `<header>`: `<div className="h-14 sm:h-16 shrink-0" aria-hidden="true" />` (56px mobile, 64px desktop).
  - Guarantees the header is permanently frozen at the top of the screen regardless of how deep the user scrolls or which tab is active.
  - Sub-views, cards, and canvas content scroll cleanly beneath the blurred frosted-glass header (`backdrop-blur-2xl bg-slate-950/95`).

### 12.2 Modern Overflow Clipping (`app/globals.css`)
- **Enhancement**:
  - Replaced `overflow-x: hidden` on `html, body` with `overflow-x: clip`.
  - Prevents horizontal viewport scrolling without establishing an accidental overflow scroll context.

### 12.3 Viewport-Bound Responsive Studio Layout (`StudioLayout.tsx`)
- **Enhancement**:
  - Updated root workspace wrapper to `flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-[440px_1fr] xl:grid-cols-[480px_1fr] overflow-y-auto lg:overflow-hidden px-4 py-2 gap-4`.
  - On desktop (`lg:`): The workspace remains locked to `100dvh` viewport height with zero page scroll; the left sidebar scrolls independently.
  - On mobile (`<lg`): Smooth vertical scrolling is enabled through `overflow-y-auto`, while the header bar remains permanently frozen at the top and the action bar remains pinned at the bottom.

---

## 13. Off-White Neumorphic Dashboard UI Kit & HUD Infographic System

### 13.1 Design Overhaul: Pastel Yellow to Off-White Neumorphism
- **Context & Motivation**:
  - Replaced the previous pastel yellow (`#F9EE99`) palette with a professional, soft **off-white neumorphic design system** (`#E8ECF2` / `#EEF2F7` / `#DFE5ED`).
  - Tailored to give the application the aesthetic of an advanced **Admin Panel vector design template**, complete with HUD diagram elements, telemetry indicators, tactile inset inputs, and extruded dashboard cards.
- **Color Tokens & Dual-Shadow Physics**:
  - **Base Canvas**: `#E8ECF2` with subtle radial lighting gradients (`rgba(255, 255, 255, 0.85)` to `rgba(205, 215, 228, 0.4)`).
  - **Raised / Extruded Surfaces (`.neo-card`, `.neo-btn`)**:
    - Light reflection (top-left): `-8px -8px 18px rgba(255, 255, 255, 0.95)`
    - Drop shadow (bottom-right): `8px 8px 18px rgba(163, 177, 198, 0.5)`
    - Edge bevel: `1px solid rgba(255, 255, 255, 0.9)`
  - **Sunken / Inset Surfaces (`.neo-card-inset`, `.neo-input`, tab wells)**:
    - Inner shadow: `inset 4px 4px 8px rgba(163, 177, 198, 0.5), inset -4px -4px 8px rgba(255, 255, 255, 0.95)`
    - Surface fill: `#E1E6EE` / `#E2E7EE`
- **Dashboard HUD & Infographic Components**:
  - `.neo-hud-panel`: Extruded dashboard tiles for telemetry, model indicators, and system metrics.
  - `.neo-hud-gauge`: Sunken dial-and-slider tracks for inference steps, guidance scale, and brush size.
  - `.hud-indicator-led`: Convex status indicators with high-contrast state coloring (Emerald for GPU online, Amber for booting/warning, Sky for active telemetry).
- **High-Contrast Readability & Accessibility**:
  - Deep slate navy typography (`#0F172A` / `#334155` / `#64748B`), delivering WCAG AAA contrast ratio across all forms, buttons, titles, and telemetry chips.

---

## 14. Strict TDD Implementation: Studio Job Pricing & Resource Calculation Engine

### 14.1 Architecture & Motivation
- Implemented `calculateStudioJobTotal` utility and `/api/pricing/estimate` endpoint following strict Test-Driven Development (TDD).
- **Core Capabilities**:
  - Automatically identifies Free Tier models (Pollinations Turbo, Kaggle GPU cluster, Hugging Face free models) to guarantee deterministic `$0.00` total price.
  - Multi-tier dynamic pricing for commercial engines:
    - Base price per image batch (4¢ baseline).
    - Resolution multiplier (2.0x scaling for >2MP high-res outputs like 2048x2048).
    - Compute step surcharges (2¢ per 25 excess sampling steps over baseline).
    - Active LoRA fusion fee (1¢ per LoRA injection per output).
    - Coupon & percentage discount calculation without permitting sub-zero totals.
  - Strict input validation raising typed `PricingValidationError` for invalid resolutions, negative steps, or NaN quantities.

### 14.2 Test Suite Evolution
- **RED Phase**: Initialized unit suite `tests/unit/pricing_calculator.test.ts` and integration suite `tests/functional/pricing_integration.test.ts` asserting missing modules.
- **GREEN Phase**: Implemented minimal robust code in `app/lib/pricingCalculator.ts`, `app/lib/aiModelRegistry.ts`, and `app/api/pricing/estimate/route.ts`.
- **Validation**: All 63 tests across 9 test files pass (100% green). Full Next.js production build verified.

---

## 15. Direct Kaggle Text-to-Image Synthesis & Automated Canvas E2E Suite

### 15.1 Direct Text-to-Image Synthesis via Blank White Latent Canvas
- **Motivation**:
  - The Kaggle Dual Tesla T4 GPU backend previously enforced mandatory `image_base64` input, restricting GPU generation exclusively to Image-to-Image editing and blocking pure Text-to-Image synthesis on Kaggle.
- **Architecture & Implementation**:
  - In `backend/kaggle_backend.py` & `kaggle/kaggle_backend.py`:
    - Updated `EditRequest` schema to allow `image_base64: Optional[str] = None`.
    - In `orchestrator.generate()`, when `input_image is None`, dynamically initializes a blank white latent canvas `Image.new("RGB", (target_w, target_h), (255, 255, 255))` conforming to requested or default 512x512 resolution (scaled to `MAX_INFERENCE_DIM`).
    - Uses runtime inspection (`inspect.signature(self.pipe.__call__).parameters`) to transparently support both image-conditioned pipelines (`QwenImageEditPlusPipeline`, `QwenImageEditPipeline`) and text-only diffusion pipelines.
    - Accurately tracks async progress with stage description `"Synthesizing text-to-image on Tesla T4..."`.
  - In `app/api/edit/route.ts` & `app/page.tsx`:
    - Removed mandatory image block when in `generate` mode for `kaggle-gpu`.
    - Aligned `ControlPanel.tsx` (in both `app/components/studio/` and `components/studio/`) so the primary action button is fully enabled in Generate mode when Kaggle GPU is online.
  - Synchronized notebook cell 2 in `backend/qwen_image_editor_backend.ipynb` and `kaggle/qwen_image_editor_backend.ipynb`.

### 15.2 Automated Canvas & Navigation Interaction Suite
- **Component**: `tests/functional/canvas_interactions.test.tsx`
- **Coverage**:
  - **Header Navigation & Quick Toggles**: All 5 tabs (`studio`, `generators`, `loras`, `gallery`, `sentinel`), Night/Day theme toggling, and SFW/NSFW safety toggle dispatching.
  - **Interactive Split-Wipe Curtain**: Dual-image rendering, divider drag handle mouse tracking with viewport coordinate scaling, and percentage boundary clamping.
  - **HTML5 Inpaint Masking**: Brush activation, stroke recording on mask canvas context, and alpha mask history tracking.
  - **ControlPanel Mode & T2I Validation**: Direct verification that Kaggle GPU in Generate mode enables the primary CTA without requiring source image upload.
- **Verification**: **69 / 69 passing tests** across 10 test files (`npm test`), **0 TypeScript errors** (`npm run typecheck`).







