/**
 * Prompt Intelligence & Smart Negative Engine
 *
 * Provides intelligent positive prompt enhancement, prompt generation archetypes,
 * and semantic negative prompt deduction based on positive prompt keywords
 * (e.g. "hyper realistic" -> suppresses "cartoon, anime, clay, silicon, plastic, doll, CGI, deformed").
 */

export interface NegativePromptAnalysis {
  negativePrompt: string;
  detectedAesthetics: string[];
  negatedStyles: string[];
  explanation: string;
}

export interface PromptArchetype {
  id: string;
  name: string;
  category: string;
  prompt: string;
  suggestedNegative: string;
}

// Curated library of inspiring masterwork prompts across distinct aesthetic genres
export const PROMPT_ARCHETYPES: PromptArchetype[] = [
  {
    id: "hyper-portrait",
    name: "8K Hyper-Realistic Studio Portrait",
    category: "Photorealism",
    prompt: "Cinematic 8k close-up portrait of a thoughtful person in soft ambient studio lighting, shot on 85mm f/1.4 lens, natural skin pores, delicate sub-surface scattering, sharp focus on eyes, dramatic chiaroscuro reflections, award-winning photography",
    suggestedNegative: "cartoon, anime, 3d render, clay, silicon, plastic, doll, drawing, sketch, illustration, CGI, smooth skin, oversaturated, deformed hands, extra fingers, blurry, watermark",
  },
  {
    id: "cyberpunk-rain",
    name: "Cyberpunk Rain-Slicked Megacity",
    category: "Sci-Fi & Cyberpunk",
    prompt: "Vibrant cyberpunk neon city street at midnight in torrential rain, towering holographic corporate displays reflecting on wet asphalt, steam rising from grates, cybernetic characters with luminescent augments, volumetric fog, Unreal Engine 5 render style, intricate architecture",
    suggestedNegative: "medieval, rustic, vintage sepia, cartoon, anime, low resolution, blown-out flat lighting, blurry, lowres, drawing, signature",
  },
  {
    id: "fantasy-landscape",
    name: "Enchanted Bioluminescent Forest",
    category: "Fantasy & Nature",
    prompt: "Mythical enchanted ancient forest illuminated by glowing ethereal mushrooms, towering moss-covered emerald trees, floating luminous spores, cascading crystal waterfalls, twilight sky with twin moons, volumetric light shafts, Artstation trending fantasy concept art",
    suggestedNegative: "modern buildings, cars, urban, plastic, lowres, text, watermark, signature, ugly, grainy, jpeg artifacts",
  },
  {
    id: "vintage-oil",
    name: "Renaissance Oil Painting Masterpiece",
    category: "Fine Art",
    prompt: "Masterpiece oil painting in the style of Rembrandt and Caravaggio, rich impasto canvas texture, dramatic chiaroscuro golden candle-lit illumination, exquisite velvety fabrics and ornate gilded details, historical elegance, museum exhibition quality",
    suggestedNegative: "photograph, 3d render, smooth digital art, neon, lens flare, modern CGI, typography, watermark, plastic, blurry",
  },
  {
    id: "macro-nature",
    name: "Microscopic Bioluminescent Creature",
    category: "Macro & Nature",
    prompt: "Hyper-detailed macro photograph of a transparent crystal jellyfish drifting in deep abyssal waters, bioluminescent neon turquoise and magenta internal organs, refractive caustic caustics, shot on 100mm macro lens, ultra-sharp optical clarity",
    suggestedNegative: "cartoon, drawing, 3d render, clay, silicon, plastic, artificial, dirty, lowres, blurry, oversaturated",
  },
  {
    id: "mecha-concept",
    name: "Futuristic Heavy Assault Mech",
    category: "Sci-Fi & Hard Surface",
    prompt: "Titan-class heavy combat bipedal mech standing in an industrial hangar bay, weathered carbon-fiber plating, hydraulic pistons, glowing exhaust heat vents, warning decals, engineering realism, dramatic low-angle shot, cinematic rim lighting, 8k hard surface concept design",
    suggestedNegative: "cartoon, anime, low-poly, clay, soft plastic, deformed limbs, blurry, pixelated, washed out, watermark",
  },
];

/**
 * Smart Negative Prompt Deduction Engine
 * Analyzes positive prompt text and generates tailored negative prompts
 * to eliminate style-polluting and contradictory artifacts.
 */
export function generateSmartNegativePrompt(positivePrompt: string): NegativePromptAnalysis {
  const p = (positivePrompt || "").toLowerCase().trim();
  const detectedAesthetics: string[] = [];
  const negatedStyles: string[] = [];
  const negativeTokens: string[] = [];

  const addNegatives = (category: string, reason: string, tokens: string[]) => {
    detectedAesthetics.push(category);
    negatedStyles.push(reason);
    tokens.forEach((t) => {
      const clean = t.trim().toLowerCase();
      if (clean && !negativeTokens.includes(clean)) {
        negativeTokens.push(clean);
      }
    });
  };

  // 1. Photorealism / Hyperrealistic / Real Photography
  if (
    p.includes("hyper realistic") ||
    p.includes("hyper-realistic") ||
    p.includes("hyperrealistic") ||
    p.includes("photorealistic") ||
    p.includes("photo") ||
    p.includes("photograph") ||
    p.includes("raw photo") ||
    p.includes("dslr") ||
    p.includes("8k portrait") ||
    p.includes("real life") ||
    p.includes("ultra realistic")
  ) {
    addNegatives(
      "Hyper-Realism & Photorealism",
      "Suppresses artificial, animated, cartoon, plastic, and synthetic clay/silicon textures",
      [
        "cartoon",
        "anime",
        "3d render",
        "clay",
        "silicon",
        "plastic",
        "doll",
        "fake skin",
        "wax figure",
        "drawing",
        "sketch",
        "illustration",
        "CGI",
        "octane render",
        "unreal engine render",
        "smooth plastic skin",
        "airbrushed",
        "oversaturated",
      ]
    );
  }

  // 2. Anime / Manga / Stylized Japanese Illustration
  if (
    p.includes("anime") ||
    p.includes("manga") ||
    p.includes("cel shaded") ||
    p.includes("ghibli") ||
    p.includes("makoto shinkai") ||
    p.includes("webtoon") ||
    p.includes("chibi")
  ) {
    addNegatives(
      "Anime & Manga Art",
      "Suppresses photographic skin texture, Western comic styles, and heavy 3D rendering",
      [
        "photorealistic",
        "real photograph",
        "realistic skin texture",
        "pores",
        "3d render",
        "western comic",
        "live action",
        "real person photograph",
        "noisy photo",
      ]
    );
  }

  // 3. Fine Art / Oil Painting / Watercolor
  if (
    p.includes("oil painting") ||
    p.includes("watercolor") ||
    p.includes("acrylic") ||
    p.includes("fine art") ||
    p.includes("canvas") ||
    p.includes("gouache") ||
    p.includes("rembrandt") ||
    p.includes("impressionist")
  ) {
    addNegatives(
      "Fine Art & Traditional Painting",
      "Suppresses modern digital camera artifacts, 3D CGI gloss, and lens flares",
      [
        "photograph",
        "3d render",
        "digital plastic",
        "smooth CGI",
        "lens flare",
        "camera flash",
        "pixelated",
        "modern digital art",
      ]
    );
  }

  // 4. Cyberpunk & Futuristic Sci-Fi
  if (
    p.includes("cyberpunk") ||
    p.includes("futuristic") ||
    p.includes("sci-fi") ||
    p.includes("hologram") ||
    p.includes("neon") ||
    p.includes("cyborg") ||
    p.includes("synthwave")
  ) {
    addNegatives(
      "Cyberpunk & Futuristic Sci-Fi",
      "Suppresses medieval, rustic, and washed-out antique styles",
      [
        "medieval",
        "rustic",
        "antique",
        "vintage sepia",
        "ancient ruins",
        "washed out lighting",
        "desaturated",
        "low contrast",
      ]
    );
  }

  // 5. Human Subjects, Faces, People & Hands (Anatomy Safeguards)
  if (
    p.includes("girl") ||
    p.includes("woman") ||
    p.includes("man") ||
    p.includes("person") ||
    p.includes("face") ||
    p.includes("portrait") ||
    p.includes("hands") ||
    p.includes("warrior") ||
    p.includes("cybernetic visor") ||
    p.includes("model")
  ) {
    addNegatives(
      "Human Subject & Anatomy Safeguards",
      "Suppresses anatomical deformities, malformed fingers, and facial distortions",
      [
        "bad anatomy",
        "deformed hands",
        "extra fingers",
        "missing fingers",
        "fused fingers",
        "extra limbs",
        "malformed limbs",
        "cross-eyed",
        "mutated eyes",
        "distorted face",
        "bad proportions",
        "cloned face",
        "morbid",
        "mutilated",
      ]
    );
  }

  // 6. Architecture / Landscapes / Nature (Object / Cleanliness Safeguards)
  if (
    p.includes("landscape") ||
    p.includes("city") ||
    p.includes("building") ||
    p.includes("architecture") ||
    p.includes("mountain") ||
    p.includes("forest") ||
    p.includes("street")
  ) {
    addNegatives(
      "Landscape & Environment Clarity",
      "Suppresses unwanted foreground people and blurry clutter",
      [
        "blurry foreground",
        "clutter",
        "distorted horizon",
        "overexposed sky",
      ]
    );
  }

  // 7. General Universal Quality & Render Baseline
  const universalNegatives = [
    "blurry",
    "low resolution",
    "low quality",
    "worst quality",
    "jpeg artifacts",
    "watermark",
    "signature",
    "username",
    "text",
    "duplicate",
    "cropped",
    "out of frame",
  ];

  universalNegatives.forEach((u) => {
    if (!negativeTokens.includes(u)) {
      negativeTokens.push(u);
    }
  });

  if (detectedAesthetics.length === 0) {
    detectedAesthetics.push("General Visual Composition");
    negatedStyles.push("Applied universal baseline quality protection");
  }

  const negativePrompt = negativeTokens.join(", ");
  const explanation = `Analyzed prompt aesthetics [${detectedAesthetics.join(", ")}]. Automatically negated ${negativeTokens.length} unwanted style attributes (${negatedStyles.join("; ")}).`;

  return {
    negativePrompt,
    detectedAesthetics,
    negatedStyles,
    explanation,
  };
}

/**
 * Returns a random inspiring prompt from the archetype registry
 */
export function getRandomPromptArchetype(): PromptArchetype {
  const idx = Math.floor(Math.random() * PROMPT_ARCHETYPES.length);
  return PROMPT_ARCHETYPES[idx];
}

/**
 * Priority Junior VL Model identifier from Hugging Face
 */
export const QWEN2_VL_JUNIOR_MODEL = {
  id: "mradermacher/Qwen2-VL-2B-Instruct-abliterated-GGUF",
  name: "Qwen2-VL 2B Junior Copilot (GGUF)",
  provider: "mradermacher / Hugging Face",
  badge: "⚡ JUNIOR VL • LOADS FIRST",
  type: "both" as const,
  latency: "~1.1s",
  status: "active" as const,
  description: "Abliterated Junior Vision-Language model (2B parameter GGUF) for ultra-fast visual comprehension, prompt rewriting, and image reasoning. Prioritized to load first before heavier DiT engines.",
  accentColor: "from-cyan-400 to-blue-500",
  sourceUrl: "https://huggingface.co/mradermacher/Qwen2-VL-2B-Instruct-abliterated-GGUF",
};

/**
 * Brain-Storm Engine: Composes a complete, professional, master-grade prompt
 * from a few words, a subject, or an empty text pane.
 */
export function brainstormPrompt(seedTopic?: string): { prompt: string; suggestedNegative: string } {
  const cleanSeed = (seedTopic || "").trim().toLowerCase();

  // If empty or purely generic, roll a master archetype
  if (!cleanSeed) {
    const arch = getRandomPromptArchetype();
    return {
      prompt: arch.prompt,
      suggestedNegative: arch.suggestedNegative,
    };
  }

  // If seed topic contains specific keywords, synthesize tailored professional compositions:
  if (cleanSeed.includes("car") || cleanSeed.includes("auto") || cleanSeed.includes("vehicle") || cleanSeed.includes("supercar")) {
    return {
      prompt: `Cinematic commercial photography of an exotic high-performance ${cleanSeed} parked on a rain-slicked mountain pass at golden hour, dynamic 3/4 low angle, sharp reflections on metallic pearlescent clearcoat, glowing LED taillight ribbons, wet asphalt spray, shot on 50mm f/1.8 anamorphic lens, 8k resolution masterwork`,
      suggestedNegative: "cartoon, anime, 3d render, clay, plastic toy, lowres, blurry, distorted wheel geometry, bad lighting, watermark, signature",
    };
  }

  if (cleanSeed.includes("portrait") || cleanSeed.includes("girl") || cleanSeed.includes("woman") || cleanSeed.includes("man") || cleanSeed.includes("person") || cleanSeed.includes("face")) {
    return {
      prompt: `Exquisite studio editorial portrait of ${cleanSeed}, dramatic cinematic Rembrandt lighting, delicate rim highlight tracing facial contours, authentic skin pores with soft subsurface scattering, sharp optical focus on expressive iris, shot on Hasselblad 100mm f/2.2 medium format, hyper-detailed Vogue magazine cover quality`,
      suggestedNegative: "cartoon, anime, 3d render, clay, silicon, plastic, doll, CGI, smooth plastic skin, airbrushed, bad anatomy, deformed hands, extra fingers, cross-eyed, blurry, watermark",
    };
  }

  if (cleanSeed.includes("cyberpunk") || cleanSeed.includes("sci-fi") || cleanSeed.includes("robot") || cleanSeed.includes("mech") || cleanSeed.includes("futuristic")) {
    return {
      prompt: `High-fidelity sci-fi concept art of ${cleanSeed} in a towering neo-Tokyo megacity, torrential rain cascading over weathered carbon-composite armor, luminescent turquoise and magenta neon illumination, volumetric haze, intricate mechanical joints and hydraulic cabling, 8k Unreal Engine 5 render`,
      suggestedNegative: "medieval, rustic, vintage sepia, cartoon, anime, clay, low-poly, washed out flat lighting, blurry, low resolution, watermark",
    };
  }

  if (cleanSeed.includes("landscape") || cleanSeed.includes("mountain") || cleanSeed.includes("nature") || cleanSeed.includes("forest") || cleanSeed.includes("ocean") || cleanSeed.includes("sunset")) {
    return {
      prompt: `Breathtaking National Geographic landscape photograph of ${cleanSeed}, captured during golden hour alpenglow, atmospheric depth with soft mist winding through valleys, crystalline foreground water reflections, ultra-sharp edge-to-edge detail, shot on Phase One 150MP camera with polarizer filter`,
      suggestedNegative: "modern buildings, clutter, cartoon, 3d render, oversaturated, blurry foreground, low resolution, blown out sky, text, watermark",
    };
  }

  // Universal Topic Expansion for any arbitrary 1-5 word seed
  return {
    prompt: `Masterpiece visual composition featuring ${cleanSeed}, beautifully framed in cinematic volumetric atmosphere, balanced three-point studio illumination with subtle color grading, intricate textures and tactile material fidelity, 8k resolution, photorealistic depth and artistic harmony`,
    suggestedNegative: "cartoon, anime, 3d render, clay, silicon, plastic, doll, CGI, blurry, low resolution, deformed, bad proportions, watermark, signature",
  };
}

/**
 * Prompt Reformer: Transforms casual, improper, or raw imaginative user text
 * into a balanced, professional prompt with image enhancing descriptors.
 */
export function reformUserPrompt(rawText: string): string {
  if (!rawText || !rawText.trim()) return "";

  let cleaned = rawText.trim();

  // Strip common conversational chat preambles
  cleaned = cleaned.replace(/^(please\s+)?(can\s+you\s+)?(i\s+want\s+(a\s+)?|create\s+(a\s+)?|make\s+(a\s+)?|draw\s+(a\s+)?|generate\s+(a\s+)?|show\s+me\s+(a\s+)?|picture\s+of\s+|photo\s+of\s+)/i, "");
  cleaned = cleaned.replace(/[.!?]+$/, ""); // strip trailing punctuation

  // Build balanced professional prompt
  return `Artfully crafted masterpiece of ${cleaned}, balanced cinematic composition, rich ambient lighting with delicate contrast, crisp photographic depth of field, hyper-detailed natural textures, 8k resolution, professional studio finish`;
}

