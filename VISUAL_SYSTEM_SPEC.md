# VISUAL SYSTEM SPECIFICATION
*Hero presets, animation/3D modules, constraints & performance budgets*

---

## OVERVIEW

This specification defines the **visual layer architecture** that works in conjunction with Template Spec V2 to ensure generated products achieve **premium visual quality** while maintaining **performance standards** and **accessibility compliance**.

**Integration Point**: This spec feeds directly into the `StylePreset` system and Canvas Module controls in the GumGenie interface.

---

## HERO PRESET CATALOG

### **1. CONVERSION-OPTIMIZED PRESETS**

#### **Authority Professional**
```typescript
preset: {
  name: "Authority Professional",
  gradientIndex: 0,           // Minimal gradient, credibility focus
  layoutType: "classic",      // Traditional, trustworthy layout
  headlineType: "benefit",    // Clear transformation promise
  buttonStyle: "rounded",     // Approachable yet professional
  buttonIcon: "unlock",       // Value unlocking metaphor
  shadowStyle: "subtle",      // Professional, not flashy
  accentOpacity: 25,          // Conservative accent usage
  titleWeight: "bold",        // Strong headline presence
  descWeight: "normal",       // Readable body text
  fontFamily: "sans",         // Modern, clean typography
  containerStyle: "flat",     // Clean, professional container
  backgroundTexture: "none"   // Distraction-free background
}

visualCharacteristics: {
  colorProfile: "trust", // Blues, grays, white dominant
  emotionalTone: "confident", 
  targetAudience: "business professionals, consultants, agencies",
  conversionFocus: "credibility and expertise"
}
```

#### **High-Energy Creator**  
```typescript
preset: {
  name: "High-Energy Creator",
  gradientIndex: 2,           // Vibrant gradient backdrop
  layoutType: "centered",     // Dynamic, focused layout
  headlineType: "scarcity",   // Urgency-driven messaging
  buttonStyle: "pill",        // Modern, action-oriented
  buttonIcon: "zap",          // Energy and speed metaphor
  shadowStyle: "deep",        // Dynamic depth and energy
  accentOpacity: 80,          // Bold accent usage
  titleWeight: "black",       // Maximum impact typography
  descWeight: "bold",         // Strong supporting text
  fontFamily: "sans",         // Modern, energetic feel
  containerStyle: "glass",    // Trendy, dynamic container
  backgroundTexture: "mesh"   // Dynamic background pattern
}

visualCharacteristics: {
  colorProfile: "energy", // Orange, purple, electric blue
  emotionalTone: "excited",
  targetAudience: "creators, influencers, young entrepreneurs",
  conversionFocus: "urgency and transformation"
}
```

#### **Minimalist Premium**
```typescript
preset: {
  name: "Minimalist Premium", 
  gradientIndex: 1,           // Subtle luxury gradient
  layoutType: "minimal",      // Clean, spacious layout
  headlineType: "direct",     // Clear, uncluttered messaging
  buttonStyle: "square",      // Precise, premium feel
  buttonIcon: "cart",         // Simple purchase metaphor
  shadowStyle: "neumorphic",  // Sophisticated depth
  accentOpacity: 15,          // Minimal, strategic accents
  titleWeight: "normal",      // Elegant, not aggressive
  descWeight: "normal",       // Refined readability
  fontFamily: "serif",        // Luxury, traditional feel
  containerStyle: "flat",     // Clean, premium container
  backgroundTexture: "dots"   // Subtle, sophisticated pattern
}

visualCharacteristics: {
  colorProfile: "luxury", // Black, gold, cream dominant
  emotionalTone: "sophisticated",
  targetAudience: "premium buyers, executives, luxury market",
  conversionFocus: "quality and exclusivity"
}
```

#### **Tech-Forward Brutalist**
```typescript
preset: {
  name: "Tech-Forward Brutalist",
  gradientIndex: 3,           // Sharp, contrasting gradient
  layoutType: "split",        // Asymmetrical, modern layout
  headlineType: "problem",    // Direct problem identification
  buttonStyle: "outline",     // Technical, precise styling
  buttonIcon: "download",     // Functional, direct action
  shadowStyle: "subtle",      // Technical, not decorative
  accentOpacity: 100,         // Bold, unapologetic accents
  titleWeight: "black",       // Strong, technical presence
  descWeight: "bold",         // Clear, direct communication
  fontFamily: "mono",         // Technical, developer feel
  containerStyle: "brutalist", // Raw, functional container
  backgroundTexture: "grid"   // Technical, structured pattern
}

visualCharacteristics: {
  colorProfile: "technical", // Neon green, dark grays, white
  emotionalTone: "powerful",
  targetAudience: "developers, tech professionals, early adopters",
  conversionFocus: "functionality and performance"
}
```

### **2. CATEGORY-SPECIFIC PRESETS**

#### **AI/Prompt Engineering Focus**
```typescript
preset: {
  name: "Neural Network",
  gradientIndex: 2,
  layoutType: "classic",
  headlineType: "benefit",
  buttonStyle: "pill",
  buttonIcon: "zap",
  shadowStyle: "deep",
  accentOpacity: 60,
  titleWeight: "bold",
  descWeight: "normal", 
  fontFamily: "sans",
  containerStyle: "glass",
  backgroundTexture: "mesh"
}

categoryOptimizations: {
  colorProfile: "ai", // Purple, blue, cyan gradients
  iconLibrary: "tech", // Brain, circuit, lightning icons
  backgroundEffects: ["neural-grid", "data-flow", "circuit-lines"],
  animationStyle: "data-processing",
  conversionElements: ["code-snippets", "ai-output-examples", "transformation-metrics"]
}
```

#### **Notion/Productivity Focus**
```typescript
preset: {
  name: "Organized Efficiency",
  gradientIndex: 0,
  layoutType: "centered",
  headlineType: "benefit",
  buttonStyle: "rounded",
  buttonIcon: "unlock",
  shadowStyle: "subtle",
  accentOpacity: 40,
  titleWeight: "bold",
  descWeight: "normal",
  fontFamily: "sans",
  containerStyle: "flat",
  backgroundTexture: "none"
}

categoryOptimizations: {
  colorProfile: "productivity", // Clean blues, organized grays
  iconLibrary: "productivity", // Checkmarks, folders, calendars
  backgroundEffects: ["clean-grid", "organized-blocks"],
  animationStyle: "systematic-flow",
  conversionElements: ["database-previews", "workflow-demos", "organization-benefits"]
}
```

#### **Digital Planner/Design Focus**
```typescript
preset: {
  name: "Creative Professional", 
  gradientIndex: 1,
  layoutType: "split",
  headlineType: "benefit",
  buttonStyle: "rounded",
  buttonIcon: "cart",
  shadowStyle: "neumorphic",
  accentOpacity: 50,
  titleWeight: "bold",
  descWeight: "normal",
  fontFamily: "sans",
  containerStyle: "glass",
  backgroundTexture: "dots"
}

categoryOptimizations: {
  colorProfile: "creative", // Warm oranges, creative purples
  iconLibrary: "design", // Brush, palette, creative tools
  backgroundEffects: ["artistic-flow", "creative-scatter"],
  animationStyle: "creative-reveal",
  conversionElements: ["design-previews", "style-variations", "creative-outcomes"]
}
```

---

## ANIMATION & 3D MODULE CATALOG

### **Background Effect Modules**

#### **Light Rays (heroBackgroundEffect: "lightrays")**
```typescript
module: "LightRays",
performance: {
  renderMode: "CSS + WebGL",
  targetFPS: 60,
  fallback: "CSS-only animation",
  budgetImpact: "medium"
},
configuration: {
  intensity: 0.3, // 0-1 scale
  speed: 0.5,     // Animation speed multiplier
  colorBlend: "multiply", // Blend mode with background
  direction: "diagonal",  // "horizontal", "vertical", "diagonal"
  particleCount: 50      // Performance vs. quality balance
},
accessibility: {
  respectsReducedMotion: true,
  providesAlternativeDesign: true,
  noFlashingElements: true
}
```

#### **Dither Effect (heroBackgroundEffect: "dither")**
```typescript
module: "DitherBackground",
performance: {
  renderMode: "CSS Filters",
  targetFPS: "N/A (static)",
  fallback: "solid background",
  budgetImpact: "low"
},
configuration: {
  intensity: 0.15, // heroDitherIntensity slider (0-1)
  pattern: "bayer", // "bayer", "floyd-steinberg", "ordered"
  colorDepth: 16,   // Color reduction amount
  noiseBlend: "overlay" // CSS blend mode
},
accessibility: {
  respectsReducedMotion: true,
  providesHighContrastMode: true,
  noFlashingElements: true
}
```

### **Typography Effect Modules**

#### **Split Text Animation (heroSplitTitleEnabled)**
```typescript
module: "SplitText",
performance: {
  renderMode: "CSS Transforms",
  targetFPS: 60,
  fallback: "instant reveal",
  budgetImpact: "low"
},
configuration: {
  splitBy: "words", // "chars", "words", "lines"
  animationType: "slideUp", // "slideUp", "fadeIn", "scaleIn"
  staggerDelay: 0.1, // Delay between elements (seconds)
  duration: 0.6      // Total animation duration
},
accessibility: {
  respectsReducedMotion: true,
  providesInstantMode: true,
  maintainsReadability: true
}
```

#### **Gradient Text Effect (heroGradientTitleEnabled)**
```typescript
module: "GradientText", 
performance: {
  renderMode: "CSS Background-Clip",
  targetFPS: "N/A (static)",
  fallback: "solid color text",
  budgetImpact: "minimal"
},
configuration: {
  gradientType: "linear", // "linear", "radial", "conic"
  colorStops: ["#667eea", "#764ba2"], // Array of colors
  direction: "45deg",     // Gradient direction
  textTransform: "none"   // Additional text styling
},
accessibility: {
  respectsReducedMotion: true,
  maintainsContrast: true,
  providesColorAlternatives: true
}
```

### **Interactive Effect Modules**

#### **Glare Hover Effect (heroGlareCtaEnabled)**
```typescript
module: "GlareHover",
performance: {
  renderMode: "CSS Transforms + Pseudo-elements",
  targetFPS: 60,
  fallback: "standard hover",
  budgetImpact: "low"
},
configuration: {
  glareOpacity: 0.3,    // Glare effect intensity
  glareDuration: 0.8,   // Animation duration (seconds)
  glareAngle: -45,      // Glare sweep angle
  triggerDistance: 20   // Hover detection sensitivity
},
accessibility: {
  respectsReducedMotion: true,
  providesNonHoverAlternatives: true,
  maintainsButtonAccessibility: true
}
```

---

## PERFORMANCE CONSTRAINTS & BUDGETS

### **Performance Budget Targets**

#### **Page Load Performance**
```typescript
budgets: {
  firstContentfulPaint: 1.5, // seconds
  largestContentfulPaint: 2.0, // seconds
  cumulativeLayoutShift: 0.1, // score
  firstInputDelay: 100, // milliseconds
  totalPageSize: 2.0 // MB maximum
}

moduleImpactLimits: {
  backgroundEffects: {
    maxRenderCost: "medium", // low/medium/high
    maxFileSize: 50, // KB
    maxAnimationNodes: 100
  },
  typographyEffects: {
    maxRenderCost: "low",
    maxFileSize: 20, // KB
    maxAnimationDuration: 2.0 // seconds
  },
  interactiveEffects: {
    maxResponseDelay: 16, // milliseconds (60fps)
    maxEventListeners: 10,
    maxDOMManipulation: "minimal"
  }
}
```

#### **Device-Specific Constraints**
```typescript
deviceBudgets: {
  mobile: {
    maxBackgroundEffects: 1, // Only one active at a time
    preferCSS: true, // Avoid WebGL on mobile
    maxAnimationDuration: 1.0, // Shorter animations
    respectBatteryStatus: true
  },
  tablet: {
    maxBackgroundEffects: 2,
    allowWebGL: true,
    maxAnimationDuration: 1.5,
    balanceQualityPerformance: true
  },
  desktop: {
    maxBackgroundEffects: 3, // All effects available
    allowWebGL: true,
    maxAnimationDuration: 2.0,
    prioritizeQuality: true
  }
}
```

### **Accessibility Constraints**

#### **Motion & Animation Standards**
```typescript
accessibilityRequirements: {
  reducedMotion: {
    respectsSystemPreference: true,
    providesToggleControl: true,
    fallbackBehaviors: {
      animations: "instant",
      backgroundEffects: "static",
      transitions: "none"
    }
  },
  colorContrast: {
    minimumRatio: 4.5, // WCAG AA standard
    largeTextRatio: 3.0, // For 18pt+ text
    testAgainstBackgrounds: true,
    provideFallbackColors: true
  },
  interactivity: {
    keyboardNavigation: true,
    screenReaderCompatible: true,
    focusIndicators: "visible",
    noFlashingContent: true // Max 3 flashes per second
  }
}
```

---

## INTEGRATION WITH TEMPLATE SPECS

### **Preset Selection Logic**
```typescript
categoryMappings: {
  AI_PROMPTS: ["Neural Network", "Tech-Forward Brutalist", "Authority Professional"],
  NOTION_TEMPLATES: ["Organized Efficiency", "Minimalist Premium", "Authority Professional"],
  DIGITAL_PLANNERS: ["Creative Professional", "Minimalist Premium", "High-Energy Creator"],
  DESIGN_TEMPLATES: ["Creative Professional", "Tech-Forward Brutalist", "High-Energy Creator"]
}

autoSelectionCriteria: {
  audienceProfile: "professional|creative|technical",
  conversionGoal: "credibility|urgency|quality",
  pricePoint: "budget|standard|premium",
  brandPersonality: "conservative|modern|bold"
}
```

### **Canvas Module Configuration**
```typescript
moduleActivation: {
  heroBackgroundEffect: {
    defaultForPreset: {
      "Authority Professional": "none",
      "Minimalist Premium": "dither",
      "High-Energy Creator": "lightrays",
      "Tech-Forward Brutalist": "none"
    },
    performanceOverride: true, // Disable on slow devices
    userToggle: true
  },
  
  heroGradientTitleEnabled: {
    defaultForPreset: {
      "Creative Professional": true,
      "High-Energy Creator": true,
      "Minimalist Premium": false,
      "Authority Professional": false
    },
    accessibilityOverride: true, // Disable if contrast fails
    userToggle: true
  }
}
```

### **Quality Gate Integration**
```typescript
visualQualityChecks: {
  presetConsistency: "all visual elements align with preset personality",
  performanceBudget: "page meets performance targets with effects enabled",
  accessibilityCompliance: "WCAG AA standards met with all effects",
  deviceCompatibility: "graceful degradation on all target devices",
  brandAlignment: "visual system supports conversion goals"
}

scoringContribution: {
  visualDesign: 25, // Total points from quality rubric
  breakdown: {
    presetAlignment: 8,      // Does preset match audience/goals?
    visualHierarchy: 7,      // Clear information flow?
    accessibility: 5,        // WCAG compliance?
    performance: 5          // Meets budget constraints?
  }
}
```

---

## IMPLEMENTATION ROADMAP

### **Phase 1: Core Presets (Immediate)**
- [ ] Implement 4 conversion-optimized presets
- [ ] Build preset selection logic based on category
- [ ] Integrate with existing StylePreset system
- [ ] Test performance on target devices

### **Phase 2: Effect Modules (Near-term)**  
- [ ] Complete background effect modules (lightrays, dither)
- [ ] Implement typography effects (split text, gradient)
- [ ] Add interactive effects (glare hover)
- [ ] Build accessibility override system

### **Phase 3: Advanced Features (Medium-term)**
- [ ] Category-specific preset variations
- [ ] Dynamic preset selection based on audience
- [ ] Performance monitoring and optimization
- [ ] A/B testing framework for visual elements

### **Success Metrics**
- **Visual Design Score**: Target 23/25 (vs. current 20/25)
- **Page Performance**: Meet all budget targets
- **Accessibility Compliance**: 100% WCAG AA
- **Conversion Impact**: +15-25% from optimized visuals

**This visual system ensures generated products achieve premium visual quality while maintaining performance and accessibility standards.**