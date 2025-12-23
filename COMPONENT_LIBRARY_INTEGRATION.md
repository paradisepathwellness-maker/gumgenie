# COMPONENT LIBRARY INTEGRATION PLAN
*Minimal tool sets & curated component combinations per template category*

---

## STRATEGIC OVERVIEW

This plan defines **curated MCP tool combinations** that align with each template category's specific needs, ensuring generated components support the **conversion optimization** and **quality standards** established in our specifications.

**Goal**: Transform generic MCP tools into **category-specific workflows** that produce high-converting, brand-consistent components.

---

## CATEGORY-SPECIFIC TOOL MAPPINGS

### **AI PROMPTS Category**

#### **Primary MCP Servers & Tools**
```typescript
mcpServers: {
  primary: "@magicuidesign/mcp",
  secondary: "@21st-dev/magic",
  fallback: "shadcn"
}

curatedTools: {
  // Conversion-focused components
  "pricing-section": {
    server: "@magicuidesign/mcp",
    tool: "create_pricing_component",
    prompt: "Create a 3-tier pricing table for AI prompt frameworks targeting developers and content creators. Include 'Framework Essentials' ($19), 'Pro Toolkit' ($49), and 'Master Collection' ($89) with clear feature differentiation and 'Most Popular' badge on Pro tier."
  },
  
  // Social proof components  
  "testimonial-grid": {
    server: "@21st-dev/magic", 
    tool: "create_testimonial_section",
    prompt: "Generate testimonial cards for AI prompt users showing specific results: 'Increased content quality by 85%', 'Saved 12 hours per week', 'Generated $5K additional revenue'. Include developer avatars and company credentials."
  },
  
  // Technical specification components
  "feature-showcase": {
    server: "shadcn",
    tool: "create_feature_grid",
    prompt: "Build feature grid highlighting prompt framework capabilities: Chain-of-Thought reasoning, Few-shot learning, Role-based prompting, Output formatting, Error handling, Model optimization. Use technical but accessible language."
  },
  
  // FAQ components for objection handling
  "ai-faq-section": {
    server: "@magicuidesign/mcp",
    tool: "create_faq_component", 
    prompt: "Create FAQ section addressing: 'Which AI models work best?', 'Do I need coding experience?', 'How quickly will I see results?', 'What if prompts don't work?', 'Can I customize for my industry?', 'Is there ongoing support?'"
  }
}

workflowSequence: [
  "feature-showcase",    // Lead with capabilities
  "testimonial-grid",    // Build credibility  
  "pricing-section",     // Present value tiers
  "ai-faq-section"      // Address objections
]
```

#### **Category-Specific Prompt Templates**
```typescript
promptTemplates: {
  audienceContext: "AI prompt engineers, content creators, developers, marketing professionals",
  valueProposition: "Transform from manual prompt trial-and-error to systematic, high-converting AI interactions",
  proofPoints: ["85% better output quality", "75% time savings", "tested on GPT-4, Claude, Gemini"],
  technicalContext: "Compatible with ChatGPT, Claude, Gemini, local LLMs. PDF + Markdown formats.",
  priceAnchoring: "Custom prompt consulting: $200/hour. Prompt marketplace: $5-15 per prompt."
}

componentStyling: {
  colorScheme: "neural", // Purple, blue, cyan gradients
  iconLibrary: "tech",   // Brain, circuit, code icons
  typography: "modern",  // Sans-serif, technical feel
  animations: "data-processing" // Subtle tech animations
}
```

### **NOTION TEMPLATES Category**

#### **Primary MCP Servers & Tools**
```typescript
mcpServers: {
  primary: "shadcn",
  secondary: "@magicuidesign/mcp", 
  fallback: "@21st-dev/magic"
}

curatedTools: {
  // Productivity-focused pricing
  "productivity-pricing": {
    server: "shadcn",
    tool: "create_pricing_table",
    prompt: "Design clean 3-tier pricing for Notion productivity templates. 'Starter Setup' ($17), 'Pro Workspace' ($39), 'Team System' ($67). Emphasize database sophistication and workflow automation. Clean, organized aesthetic."
  },
  
  // Database showcase components
  "database-preview": {
    server: "@magicuidesign/mcp",
    tool: "create_feature_showcase", 
    prompt: "Showcase Notion database capabilities: Task management with 15+ properties, Project tracking with timeline views, Goal tracking with progress formulas, Knowledge base with relations, Habit tracking with automation."
  },
  
  // Workflow demonstration  
  "workflow-benefits": {
    server: "@21st-dev/magic",
    tool: "create_benefit_grid",
    prompt: "Highlight productivity transformation: 'Capture everything in one place', 'Connect related information automatically', 'Track progress with visual dashboards', 'Collaborate seamlessly with teams', 'Scale systems as you grow'."
  },
  
  // Setup guidance components
  "notion-setup-guide": {
    server: "shadcn", 
    tool: "create_step_component",
    prompt: "Create step-by-step setup guide: '1. Duplicate template to your workspace', '2. Customize databases for your needs', '3. Set up automation formulas', '4. Import existing data', '5. Start organizing immediately'."
  }
}

workflowSequence: [
  "database-preview",     // Show functionality
  "workflow-benefits",    // Demonstrate value
  "productivity-pricing", // Present tiers
  "notion-setup-guide"   // Reduce friction
]
```

#### **Category-Specific Prompt Templates**
```typescript
promptTemplates: {
  audienceContext: "Notion users, productivity enthusiasts, small business owners, project managers",
  valueProposition: "Transform from scattered information chaos to organized, automated productivity system",
  proofPoints: ["Save 5+ hours/week", "Increase project completion by 60%", "Used by 10,000+ professionals"],
  technicalContext: "Works with Notion free and paid plans. Includes databases, formulas, and automation.",
  priceAnchoring: "Custom Notion consulting: $150/hour. Individual databases: $25-50 each."
}

componentStyling: {
  colorScheme: "productivity", // Clean blues, organized grays
  iconLibrary: "organization", // Checkmarks, folders, calendars
  typography: "clean",         // Sans-serif, readable
  animations: "systematic"     // Smooth, organized transitions
}
```

### **DIGITAL PLANNERS Category**

#### **Primary MCP Servers & Tools**
```typescript
mcpServers: {
  primary: "@21st-dev/magic",
  secondary: "@magicuidesign/mcp",
  fallback: "shadcn"
}

curatedTools: {
  // Planner-specific pricing
  "planner-pricing": {
    server: "@21st-dev/magic",
    tool: "create_pricing_cards",
    prompt: "Design pricing for digital planners targeting iPad users. 'Essential Planner' ($12), 'Complete System' ($27), 'Ultimate Bundle' ($45). Include multiple color variants and bonus sticker packs. Emphasize GoodNotes/Notability compatibility."
  },
  
  // Visual preview components
  "planner-showcase": {
    server: "@magicuidesign/mcp",
    tool: "create_image_gallery",
    prompt: "Create visual gallery showing planner pages: daily layout with time blocks, weekly overview with goal tracking, monthly calendar with habit trackers, note pages with dot grid, stickers and digital elements."
  },
  
  // App compatibility information
  "compatibility-grid": {
    server: "shadcn",
    tool: "create_compatibility_table",
    prompt: "Show compatibility across iPad apps: GoodNotes 5 (full features), Notability (full features), CollaNote (annotations), Noteshelf (handwriting), OneNote (basic), PDF Expert (viewing). Include feature comparison."
  },
  
  // Creative benefits showcase  
  "creativity-benefits": {
    server: "@21st-dev/magic",
    tool: "create_benefit_cards",
    prompt: "Highlight digital planner benefits: 'Infinite pages, zero waste', 'Search your handwriting', 'Backup to cloud automatically', 'Multiple color variants included', 'Print physical copies anytime', 'Sync across all devices'."
  }
}

workflowSequence: [
  "planner-showcase",     // Visual first impression
  "creativity-benefits",  // Show advantages
  "compatibility-grid",   // Address technical concerns
  "planner-pricing"      // Present value tiers
]
```

#### **Category-Specific Prompt Templates**
```typescript
promptTemplates: {
  audienceContext: "iPad users, digital planning enthusiasts, students, creative professionals",
  valueProposition: "Transform from physical planner limitations to infinite digital creativity and organization",
  proofPoints: ["Works perfectly on iPad Pro", "300 DPI handwriting quality", "Used by 50,000+ planners"],
  technicalContext: "High-resolution PDF, 11x8.5 landscape, optimized for Apple Pencil, GoodNotes ready.",
  priceAnchoring: "Physical luxury planners: $40-80. Custom design services: $300+."
}

componentStyling: {
  colorScheme: "creative", // Warm oranges, creative purples
  iconLibrary: "design",   // Brush, palette, creative tools  
  typography: "friendly",  // Rounded sans-serif, approachable
  animations: "organic"    // Natural, flowing transitions
}
```

### **DESIGN TEMPLATES Category**

#### **Primary MCP Servers & Tools**
```typescript
mcpServers: {
  primary: "@magicuidesign/mcp",
  secondary: "shadcn", 
  fallback: "@21st-dev/magic"
}

curatedTools: {
  // Design-focused pricing
  "design-pricing": {
    server: "@magicuidesign/mcp",
    tool: "create_pricing_section",
    prompt: "Create pricing for design template kits targeting designers and agencies. 'Component Kit' ($25), 'Design System' ($59), 'Agency License' ($129). Include commercial use rights and client project permissions."
  },
  
  // Template showcase grid
  "template-gallery": {
    server: "@magicuidesign/mcp",
    tool: "create_component_showcase",
    prompt: "Showcase design template variety: Social media posts (Instagram, LinkedIn), Brand identity (logos, business cards), Marketing materials (flyers, presentations), Web components (buttons, cards), Print templates (brochures, posters)."
  },
  
  // Platform compatibility
  "platform-support": {
    server: "shadcn",
    tool: "create_feature_table",
    prompt: "Show platform compatibility: Figma (full editability), Canva (drag-and-drop), Adobe Creative Suite (PSD/AI files), Sketch (imported components), PowerPoint (presentation templates). Include file format details."
  },
  
  // ROI and time savings
  "design-roi": {
    server: "@21st-dev/magic", 
    tool: "create_metrics_showcase",
    prompt: "Demonstrate design value: 'Save 15+ hours per project', 'Professional quality in minutes', '500% faster than starting from scratch', 'Used by top agencies worldwide', 'Consistently on-brand results'."
  }
}

workflowSequence: [
  "template-gallery",    // Show variety and quality
  "design-roi",         // Demonstrate value/time savings
  "platform-support",   // Address compatibility
  "design-pricing"      // Present licensing tiers
]
```

#### **Category-Specific Prompt Templates**
```typescript
promptTemplates: {
  audienceContext: "Graphic designers, marketing agencies, small business owners, content creators",
  valueProposition: "Transform from time-consuming custom design to rapid, professional-quality template customization",
  proofPoints: ["Save 20+ hours per project", "Agency-quality results", "Commercial use included"],
  technicalContext: "Multiple file formats, fully editable, brand guidelines included, print-ready.",
  priceAnchoring: "Custom design projects: $500-5000. Freelance design: $50-150/hour."
}

componentStyling: {
  colorScheme: "professional", // Sophisticated grays, accent colors
  iconLibrary: "creative",     // Design tools, creative process
  typography: "elegant",       // Mix of sans and serif for sophistication  
  animations: "refined"        // Smooth, professional transitions
}
```

---

## MINIMAL TOOL SETS

### **Core Tool Requirements per Category**
```typescript
minimalToolSets: {
  AI_PROMPTS: [
    "pricing-section",      // Essential for monetization
    "feature-showcase",     // Technical credibility  
    "testimonial-grid"      // Social proof
  ],
  
  NOTION_TEMPLATES: [
    "productivity-pricing", // Clean, organized pricing
    "database-preview",     // Core functionality demo
    "workflow-benefits"     // Value demonstration
  ],
  
  DIGITAL_PLANNERS: [
    "planner-pricing",      // Visual, creative pricing
    "planner-showcase",     // Visual first impression
    "compatibility-grid"    // Technical reassurance
  ],
  
  DESIGN_TEMPLATES: [
    "design-pricing",       // Professional pricing structure
    "template-gallery",     // Showcase variety/quality
    "platform-support"     // Multi-platform compatibility
  ]
}

fallbackStrategies: {
  serverUnavailable: "Use shadcn as universal fallback with generic prompts",
  toolFailure: "Generate safe fallback pricing block (3-tier structure)",
  timeoutOccurs: "Return cached component template with placeholder content"
}
```

### **Quality Assurance Integration**
```typescript
componentQualityChecks: {
  conversionOptimization: {
    hasPricingTiers: true,        // 3-tier minimum
    includesSocialProof: true,    // Testimonials or metrics
    addressesObjections: true,    // FAQ or benefits section
    hasCallToAction: true        // Clear next steps
  },
  
  technicalStandards: {
    mobileResponsive: true,       // Works on all screen sizes  
    accessibleContrast: true,     // WCAG AA compliance
    performanceBudget: true,      // Under performance limits
    crossBrowserTested: true     // Chrome, Safari, Firefox, Edge
  },
  
  categoryAlignment: {
    audienceAppropriate: true,    // Language and tone match
    visuallyConsistent: true,     // Matches category aesthetic
    functionallyRelevant: true,   // Serves category-specific needs
    brandAligned: true           // Supports conversion goals
  }
}
```

---

## WORKFLOW ORCHESTRATION

### **Component Generation Sequence**
```typescript
workflow: {
  step1: {
    action: "analyze_category",
    input: "Selected template category",
    output: "Curated tool set + prompt templates"
  },
  
  step2: {
    action: "generate_primary_component", 
    input: "Primary tool + context-aware prompt",
    output: "Hero component (pricing or showcase)"
  },
  
  step3: {
    action: "generate_supporting_components",
    input: "Secondary tools + brand consistency",
    output: "2-3 supporting sections"
  },
  
  step4: {
    action: "optimize_for_conversion",
    input: "All components + quality checklist", 
    output: "Conversion-optimized content blocks"
  },
  
  step5: {
    action: "validate_quality_score",
    input: "Complete component set + rubric",
    output: "80+ quality score confirmation"
  }
}

errorHandling: {
  componentFailure: "Fall back to next tool in sequence",
  serverTimeout: "Use cached template with live data",
  qualityFailure: "Regenerate with enhanced prompts",
  completeFailure: "Generate safe fallback pricing block"
}
```

### **Integration with Generation System**
```typescript
integrationPoints: {
  geminiService: {
    enhancePrompts: "Add category-specific context to all MCP prompts",
    validateOutput: "Check generated components against quality standards", 
    optimizeConversion: "Apply conversion psychology to component content"
  },
  
  storeActions: {
    addComponentBlock: "Convert MCP output to ContentBlock format",
    updateProduct: "Integrate components into product structure",
    applyPreset: "Ensure visual consistency with selected preset"
  },
  
  uiComponents: {
    previewSystem: "Show component preview before insertion",
    insertionFlow: "Seamless addition to content blocks array",
    editingCapability: "Allow post-insertion customization"
  }
}
```

---

## SUCCESS METRICS & OPTIMIZATION

### **Component Performance Targets**
```typescript
performanceTargets: {
  conversionMetrics: {
    qualityScoreImprovement: "+15-20 points", // From 65 to 80-85
    conversionRateIncrease: "+25-40%",        // Better components → higher conversion
    averageOrderValue: "+60-100%",           // 3-tier pricing impact
    customerSatisfaction: "4.5+ stars"       // Quality and completeness
  },
  
  technicalMetrics: {
    componentGenerationTime: "< 30 seconds",  // Including AI formatting
    errorRate: "< 5%",                       // Fallbacks handle failures
    mobileCompatibility: "100%",             // All components responsive
    accessibilityCompliance: "WCAG AA"      // Full standard compliance
  },
  
  usabilityMetrics: {
    userAdoptionRate: "80%+",               // Users try component generation
    insertionSuccessRate: "95%+",          // Components successfully added
    postInsertionEditing: "< 30%",         // Most components need no editing
    workflowCompletion: "90%+"             // Users complete full workflow
  }
}
```

### **Continuous Improvement Process**
```typescript
optimizationCycle: {
  dataCollection: {
    componentUsage: "Track which tools/categories used most",
    qualityScores: "Monitor generated component quality over time", 
    userFeedback: "Collect ratings on generated components",
    conversionData: "Track sales performance of generated products"
  },
  
  analysisPhase: {
    identifyPatterns: "Which combinations produce highest quality?",
    findGaps: "Where are users still editing components?",
    measureImpact: "What's the ROI of each component type?",
    benchmarkCompetitors: "How do our components compare?"
  },
  
  improvementActions: {
    promptOptimization: "Refine prompts based on successful patterns",
    toolSelection: "Replace underperforming tools with better alternatives",
    workflowUpdates: "Optimize sequence based on user behavior",
    qualityEnhancements: "Raise standards as capabilities improve"
  }
}
```

**This integration plan ensures MCP tools generate category-appropriate, conversion-optimized components that support our 80+ quality score targets and premium positioning strategy.**