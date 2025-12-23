# AI PROMPTS — PRODUCT SPECIFICATIONS FOR DESIGNERS
## Complete Build Guide & Technical Specifications

---

## OVERVIEW

**Product Category**: Prompt Engineering Framework
**Platforms**: ChatGPT, Claude, Google Gemini, other LLMs
**Delivery Format**: PDF, Markdown, Notion, Google Doc
**File Format**: .PDF (primary), .MD (secondary)
**Resolution**: 300 DPI for PDF (print quality)
**Typography**: Clear, readable sans-serif (Helvetica, Arial, or system fonts)
**Color Depth**: RGB or CMYK (for print)
**Expected Build Time**: 3-5 days per pack
**Expected File Size**: 2-8 MB (PDF), 500KB (Markdown)

---

## PROJECT SPECIFICATIONS

### 1. DOCUMENT STRUCTURE & LAYOUT

#### Overall Organization
```
[PDF Structure]
├─ Front Matter
│  ├─ Title Page
│  ├─ Table of Contents
│  ├─ Quick Start (1 page)
│  └─ Guide Overview (1-2 pages)
│
├─ Section 1: Setup & Model Guidance (5-7 pages)
│  ├─ How to use these prompts
│  ├─ Model recommendations (ChatGPT, Claude, etc.)
│  ├─ Settings & optimization
│  └─ Prompt structure explained
│
├─ Section 2: Framework Prompts (10-15 pages)
│  ├─ Core Prompt 1 with examples
│  ├─ Core Prompt 2 with examples
│  ├─ Core Prompt 3 with examples
│  ├─ Core Prompt 4 with examples
│  ├─ Core Prompt 5-7 with examples
│  └─ How to chain them together
│
├─ Section 3: Specialized Prompts (15-25 pages)
│  ├─ Use-case-specific Prompt 1-12
│  ├─ Variations and adaptations
│  └─ Real output examples
│
├─ Section 4: Workflows & Chains (8-12 pages)
│  ├─ Workflow 1: [Goal]
│  ├─ Workflow 2: [Goal]
│  ├─ Workflow 3: [Goal]
│  └─ How to customize for your needs
│
├─ Section 5: Advanced & Customization (10-15 pages)
│  ├─ Prompt engineering best practices
│  ├─ How to modify prompts
│  ├─ Troubleshooting guide
│  └─ Resources and references
│
└─ Back Matter
   ├─ Quick Reference Card
   ├─ Index (searchable)
   └─ Contact & Support
```

#### Page Layout Specifications

**Standard Text Page**:
- **Margins**: 1 inch (top/bottom/sides)
- **Header**: Template name + page number (top right, 10px font)
- **Column layout**: Single column (readable line length: 50-75 characters)
- **Font**: 11-12pt body text, 10pt for code/examples
- **Line spacing**: 1.5 (readable, not cramped)
- **Paragraph spacing**: 12pt before, 0pt after (Notion-style)

**Code/Prompt Page**:
- **Background**: Light gray (#F3F4F6) for prompt blocks
- **Border**: 1pt solid #E5E7EB around prompts
- **Padding**: 12pt inside prompt blocks
- **Font**: Monospace (Courier New, Monaco, or Courier) 10pt
- **Line breaks**: Preserved (important for prompt formatting)

**Example Output Page**:
- **Structure**: Original prompt (left 40%), output (right 60%)
- **Prompt background**: Light blue (#EFF6FF)
- **Output background**: Light green (#F0FDF4)
- **Borders**: Clear visual separation
- **Font**: Regular for output, monospace for prompt

---

### 2. PROMPT SPECIFICATIONS

#### Prompt Structure Template
```
[PROMPT TITLE]
Difficulty: ⭐ (1-5 stars)
Use Case: [When to use this]
Model(s): ChatGPT 4.0 / Claude 3 Opus / Both
Estimated Cost: Free tier / $0.01 / $0.05 [approximate]

─────────────────────

ROLE: [Clear role definition]

CONTEXT: [Background, constraints, situation]

TASK: [Exactly what you want the AI to do]

OUTPUT FORMAT: [How you want the result structured]

CONSTRAINTS: [What to avoid, limits, guardrails]

EXAMPLES (optional): [1-2 examples of good output]

─────────────────────

💡 TIP: [Pro tip for better results]
⚙️ VARIATION: [How to modify for different use]
📌 BEST FOR: [Specific use cases where this excels]
```

#### Prompt Formatting Rules

**For PDF**:
- **[BRACKETS]** = Variables user fills in (shown in blue)
- **{CURLY BRACES}** = Optional sections (shown in gray)
- **Line breaks** = Preserved exactly as written
- **Indentation** = Preserved for readability

**Example**:
```
ROLE: You are a [PROFESSION] specializing in [SPECIALTY].

CONTEXT:
- Client industry: [YOUR INDUSTRY]
- Project scope: [PROJECT DETAILS]
- Timeline: [DEADLINE]

TASK: [YOUR SPECIFIC TASK]
```

**Color Coding** (in PDF):
- Blue: Variables to replace
- Gray: Optional sections
- Green: Pro tips
- Orange: Warnings/cautions
- Dark gray: Actual prompt text

---

### 3. PROMPT CATEGORIES & SPECIFICATIONS

#### Category 1: FRAMEWORK PROMPTS (5-7 total)
**Purpose**: Core system prompts that build on each other

**Prompt 1: Situation Analysis**
```
Title: "Understand the Landscape"
Purpose: Analyze current situation, opportunities, challenges
Model fit: Both (ChatGPT clearer, Claude more nuanced)
Length: ~200-300 words (medium complexity)
Output: Structured analysis (4-5 sections)
Dependencies: None (starting point)
Variations: 2 (brief vs. comprehensive)
```

**Prompt 2: Problem Definition**
```
Title: "Define the Core Problem"
Purpose: Move from situation to specific problem statement
Model fit: Claude (excels at problem framing)
Length: ~250-400 words
Output: Problem statement + root causes
Dependencies: Follows Prompt 1
Variations: 3 (beginner, intermediate, advanced)
```

**Prompt 3: Solution Development**
```
Title: "Generate Solutions"
Purpose: Create 5-10 solution options
Model fit: Both (GPT-4 quantity, Claude quality)
Length: ~300-500 words
Output: Numbered list with pros/cons
Dependencies: Follows Prompt 2
Variations: 2 (creative vs. practical)
```

**Prompt 4: Solution Evaluation**
```
Title: "Evaluate & Rank Solutions"
Purpose: Compare solutions, pick best fit
Model fit: ChatGPT (strong analysis)
Length: ~200-350 words
Output: Ranked solutions with scoring
Dependencies: Follows Prompt 3
Variations: 2 (quick vs. detailed)
```

**Prompt 5: Action Planning**
```
Title: "Create Implementation Plan"
Purpose: Convert solution to concrete actions
Model fit: Both (Claude more detailed, GPT more concise)
Length: ~300-400 words
Output: Step-by-step plan with timeline
Dependencies: Follows Prompt 4
Variations: 3 (1-week, 1-month, 3-month)
```

**Prompt 6: Risk Assessment** (Optional)
```
Title: "Identify Risks & Contingencies"
Purpose: Anticipate problems, prepare responses
Model fit: Claude (cautious, thorough)
Length: ~250-350 words
Output: Risk matrix + mitigation strategies
Dependencies: Optional after Prompt 5
Variations: 1 (comprehensive)
```

**Prompt 7: Refinement & Iteration**
```
Title: "Refine Based on Feedback"
Purpose: Improve plan with user feedback loop
Model fit: Both
Length: ~200-300 words
Output: Updated plan addressing feedback
Dependencies: Optional, uses previous prompts
Variations: 2 (minor vs. major adjustments)
```

#### Category 2: SPECIALIZED PROMPTS (8-12 per pack)
**Purpose**: Use-case specific, deep-dive prompts

**Example Cluster: Email Marketing**
```
Specialized Prompt 1: Subject Line Generator
├─ Input: Product/offer, audience
├─ Output: 5 subject lines + A/B test recommendations
├─ Model: GPT-4 (good at copywriting)
└─ Variations: By industry (B2B, B2C, DTC, etc.)

Specialized Prompt 2: Email Copy Template
├─ Input: Product/offer, tone, CTA
├─ Output: Full email (AIDA structure)
├─ Model: Both (Claude more empathetic)
└─ Variations: Welcome, promotional, nurture sequences

Specialized Prompt 3: Segment Targeting
├─ Input: Product, audience segments
├─ Output: Segment definitions + messaging variations
├─ Model: Claude (nuanced understanding)
└─ Variations: 3 (small business, B2B, SaaS)

Specialized Prompt 4: Performance Analysis
├─ Input: Email metrics
├─ Output: Analysis + recommendations
├─ Model: GPT-4 (strong analytical)
└─ Variations: 2 (diagnostic, optimization-focused)
```

#### Category 3: PROMPT CHAINS & WORKFLOWS (2-3 workflows)
**Purpose**: Sequences showing how to use multiple prompts together

**Workflow Example 1: "From Idea to Launch (20 Days)"**
```
Day 1-2: Run Framework Prompt 1 (Situation Analysis)
Day 3-4: Run Framework Prompt 2 (Problem Definition)
Day 5-6: Run Specialized Prompt 1 (Email Angles)
Day 7-8: Run Framework Prompt 3 (Solution Development)
Day 9-10: Run Specialized Prompt 2 (Email Copy)
Day 11-12: Run Framework Prompt 4 (Evaluation)
Day 13-14: Run Specialized Prompt 3 (Segment Analysis)
Day 15-17: Run Framework Prompt 5 (Action Plan)
Day 18: Compile all outputs into final launch plan
Day 19-20: Execute plan + measure
```

**Workflow Example 2: "Weekly Content Production"**
```
Monday: Topic Ideation (Specialized Prompt X)
Tuesday: Research & Synthesis (Framework Prompt 1)
Wednesday: Outline Creation (Specialized Prompt Y)
Thursday: Copy Generation (Specialized Prompt Z)
Friday: Optimization & Publishing (Framework Prompt 7)
```

---

### 4. VISUAL DESIGN SPECIFICATIONS

#### Typography
- **Title Font**: 24pt, Bold, #1F2937 (dark gray)
  - Example: "FRAMEWORK PROMPTS"
  
- **Prompt Title Font**: 16pt, Semibold, #0F766E (teal/primary color)
  - Example: "Define the Core Problem"
  
- **Subheading Font**: 12pt, Semibold, #374151 (medium gray)
  - Example: "ROLE:" in prompt structure
  
- **Body Font**: 11pt, Regular, #1F2937
  - Line height: 1.5
  - Paragraph spacing: 12pt before
  
- **Code/Prompt Font**: 10pt, Monospace (Courier New), #111827
  - Line height: 1.6
  - Background: #F3F4F6
  - Line numbers: Optional (#9CA3AF gray)
  
- **Note/Tip Font**: 10pt, Regular, #065F46 (green text on light green background)
  - Background: #F0FDF4 (very light green)

#### Color Palette
- **Primary**: #0F766E (teal) - Titles, emphasis, call-outs
- **Secondary**: #3B82F6 (blue) - Links, variables, technical info
- **Accent**: #F59E0B (amber) - Warnings, important notes
- **Success**: #10B981 (green) - Tips, positive notes
- **Danger**: #DC2626 (red) - Cautions, don't-do's
- **Neutral**:
  - Text: #1F2937 (dark gray)
  - Background: #FFFFFF (white)
  - Borders: #E5E7EB (light gray)
  - Disabled: #D1D5DB (medium gray)

#### Box Styling
```
[PROMPT BLOCK]
├─ Background: #F3F4F6 (light gray)
├─ Border: 1px solid #D1D5DB
├─ Padding: 12pt all sides
├─ Corner radius: 4pt
└─ Shadow: Optional, light (0 1px 2px rgba(0,0,0,0.05))

[TIP BLOCK]
├─ Background: #F0FDF4 (light green)
├─ Border: 1px solid #10B981
├─ Padding: 12pt all sides
├─ Corner radius: 4pt
├─ Icon: 💡 (left side)
└─ Text color: #065F46

[WARNING BLOCK]
├─ Background: #FEF2F2 (light red)
├─ Border: 1px solid #DC2626
├─ Padding: 12pt all sides
├─ Corner radius: 4pt
├─ Icon: ⚠️ (left side)
└─ Text color: #7F1D1D

[EXAMPLE BLOCK]
├─ Background: #F0F9FF (light blue for prompt)
├─ Background: #F0FDF4 (light green for output)
├─ Border: 2px dashed #3B82F6 (prompt) / #10B981 (output)
├─ Padding: 12pt
└─ Corner radius: 4pt
```

#### Page Layout Elements
```
[HEADER]
├─ Height: 0.5 inches
├─ Content: Template name (left) + Page # (right)
├─ Font: 10pt gray
├─ Border bottom: 1px #E5E7EB

[FOOTER]
├─ Height: 0.5 inches
├─ Content: Copyright + contact (center)
├─ Font: 8pt gray
├─ Border top: 1px #E5E7EB

[SECTION BREAK]
├─ Vertical spacing: 24pt before + after
├─ Visual: Section number (large, light gray)
├─ Visual: Horizontal line (1px gray)
└─ Example: "2" + line (between sections)

[PAGE BREAK]
├─ Every new section = new page
├─ No orphaned headers (header + content min 2 lines)
└─ Visual continuity with running header
```

---

### 5. CONTENT SPECIFICATIONS

#### Example Output Format
```
[PROMPT (shown in prompt-colored box)]
ROLE: You are a [content strategy expert].
CONTEXT: I run a [SaaS company] targeting [B2B buyers].
TASK: Generate 5 unique blog post angles...

─────────────────────

[OUTPUT (shown in output-colored box)]
1. "Why Traditional [Pain Point] No Longer Works in 2025"
   - Unique angle: Contrarian take on outdated approaches
   - Hook: "Everyone's doing [old method]..."
   - Target: Technical founders skeptical of new tools

2. "The [Tool] + [Competitor] Comparison Nobody is Making"
   - Unique angle: Unexpected comparison combining tools
   - Hook: "Most comparisons miss..."
   - Target: Product-focused decision makers
   
[... continues with 3 more examples ...]
```

#### Sample Data
**For Content Prompts**:
- Real blog titles (from successful creators)
- Real subject lines (45%+ open rate)
- Real email copy (anonymized from brands)
- Real social media posts (with engagement metrics)

**For Business Prompts**:
- Real market analysis examples
- Real competitor research summaries
- Real customer avatar templates
- Real financial model examples

**For Technical Prompts**:
- Real code examples (working code)
- Real architecture diagrams
- Real error messages + solutions
- Real performance optimization examples

#### Before/After Examples
```
[WEAK PROMPT]
"Write an email about my product."

[WEAK OUTPUT]
"Check out our new software. It's great and you should buy it. 
Click here to learn more."

═════════════════════════════════════

[STRONG PROMPT]
ROLE: You are an email copywriter specializing in SaaS.
CONTEXT: Product: Project management tool, Audience: Busy managers
TASK: Write a 3-paragraph email explaining why our tool saves 
      10 hours/week vs. competitors.
OUTPUT FORMAT: AIDA structure (Attention, Interest, Desire, Action)

[STRONG OUTPUT]
Subject: The 10 hours you're wasting every week

Dear [Name],

Most project managers spend 10+ hours weekly on status updates 
instead of actual work. That's 500 hours annually.

We built [Product] to eliminate busywork. Real-time dashboards 
replace the updates. Smart automations replace the manual work.

Join 5,000+ teams who've reclaimed their week. Try free for 14 days.

[Try for Free]

Best,
[Your name]
```

---

### 6. DOCUMENT SPECIFICATIONS

#### PDF Specifications
- **Format**: PDF 1.4 (compatibility)
- **Resolution**: 300 DPI (high quality)
- **Color space**: RGB or CMYK (both supported)
- **Fonts**: Embedded (all fonts included in file)
- **Compression**: Moderate (readable + reasonable file size)
- **Pages**: 30-50 pages typical (keeps focused)
- **File size**: Target 3-8 MB

#### Markdown Specifications (Alternative Format)
```
# Title

## Section 1: Setup
### Subsection 1.1
Text content

## Section 2: Prompts
### Framework Prompt 1

```
[PROMPT BLOCK - code formatting]
ROLE: ...
CONTEXT: ...
```

💡 **Tip**: Text in bold
⚠️ **Warning**: Text in bold
```

#### Google Docs/Notion Specifications (Sharing Format)
- **Structure**: Same as PDF (chapters/sections)
- **Styling**: Headings (H1, H2, H3), body text, code blocks
- **Comments**: Enabled for user feedback/questions
- **Sharing**: View-only with download option
- **Mobile friendly**: Responsive layout

---

### 7. FILE ORGANIZATION

#### Folder Structure (if multiple files)
```
[AI_Prompts_Pack]
├─ AI_Prompts_Master.pdf (main document, 50 pages)
├─ AI_Prompts_Quick_Reference.pdf (1-page cheat sheet)
├─ Framework_Prompts.md (framework only, markdown)
├─ Specialized_Prompts.md (specialized, markdown)
├─ Workflows.md (chains and sequences, markdown)
├─ Examples_Output.md (before/after, markdown)
└─ README.txt (instructions on how to use files)
```

#### File Naming Convention
```
Format: [PackName]_[Section]_[Version].pdf
Examples:
- ContentCreation_Prompts_v1.pdf
- BusinessStrategy_Framework_v1.pdf
- AIArt_Specialized_v2.pdf
- Workflows_ContentToLaunch_v1.md
```

---

### 8. INTERACTIVITY & NAVIGATION

#### Hyperlinks (PDF)
- **Table of Contents**: Clickable links to sections
- **Cross-references**: "See Framework Prompt 3" links to that prompt
- **External links**: To resources (Notion, tools, templates)
- **Email links**: Support contact (mailto:)

#### Bookmarks (PDF Structure)
```
[Bookmarks Panel]
├─ Quick Start
├─ Section 1: Setup
├─ Section 2: Framework Prompts
│  ├─ Prompt 1: Situation Analysis
│  ├─ Prompt 2: Problem Definition
│  └─ [continues...]
├─ Section 3: Specialized
│  ├─ Content Prompts
│  ├─ Business Prompts
│  └─ [continues...]
├─ Section 4: Workflows
└─ Section 5: Advanced
```

#### Search Functionality (PDF)
- **Searchable text** (not images/scans)
- **OCR** if any images contain text
- **Index** with key terms (at end of document)

---

### 9. ACCESSIBILITY SPECIFICATIONS

#### Text Contrast
- **Minimum**: 4.5:1 (WCAG AA)
- **Example**: #1F2937 (dark gray) on #FFFFFF (white) = 13.6:1 ✓
- **Example**: #374151 (medium gray) on #FFFFFF = 9.7:1 ✓
- **Caution**: #666666 on white = 3.5:1 ✗ (too light)

#### Font Sizing
- **Minimum**: 10pt (code/captions only)
- **Standard**: 11-12pt (body text, highly readable)
- **Large**: 14pt+ (headers, emphasis)
- **No tiny text** (8pt or less is inaccessible)

#### Formatting
- **Bold/Italic**: Used for emphasis (not just color)
- **Color + shape**: Important info uses multiple signals
- **Example**: Red ✗ + warning symbol (not just color)

#### Document Structure
- **Proper headings**: H1 for sections, H2 for subsections (screen readers)
- **Alternative text**: For any images or diagrams
- **Reading order**: Top-to-bottom (proper PDF structure)

---

### 10. EXAMPLES & TEMPLATES

#### Example 1: Content Creation Prompt Pack
```
[Cover Page]
Title: "Content Creation Prompts"
Subtitle: "5-Framework + 15-Specialized Prompts for 
          Blogs, Email, Social, Video Scripts"
Author: [Your name]
Version: 1.0
Price: $12-19

[Quick Start - 1 page]
Step 1: Choose your content type (blog, email, social, video)
Step 2: Run Framework Prompt 1 (Topic Research)
Step 3: Run Specialized Prompt for your format
Step 4: Customize the output
Step 5: Publish or iterate

[Setup Section - 5 pages]
- Model recommendations
- Settings optimization
- Prompt structure explained

[Framework Section - 12 pages]
5 Prompts:
1. Topic Research & Angle Discovery
2. Research & Synthesis
3. Content Outline Creation
4. Draft Generation
5. Optimization & Distribution

[Specialized Section - 20 pages]
15 Prompts:
- 4 Email prompts
- 4 Blog prompts
- 4 Social media prompts
- 3 Video script prompts

[Workflows - 8 pages]
Workflow 1: 5-day blog post creation
Workflow 2: Weekly content production
Workflow 3: Launch email sequence

[Advanced - 10 pages]
- Customization guide
- Prompt engineering best practices
- Troubleshooting
- Resources
```

#### Example 2: AI Art Prompts Pack
```
[Structure Similar Above But:]

[Specialized Prompts - 30 pages]
Organized by:
- Character design (6 prompts)
- Landscape (6 prompts)
- Product/object (4 prompts)
- Styles (8 prompts)
- Negative prompts (4 prompts)

[Each Prompt Format]
Title: "Fantasy Character - Epic Warrior"
Model: Midjourney / Stable Diffusion / DALL-E
Difficulty: ⭐⭐⭐ (3/5 stars)

[PROMPT]
/imagine prompt: Epic fantasy warrior, detailed armor,
glowing sword, dramatic lighting, 8k, cinematic...

[VARIATIONS]
Replace [material] with: steel, gold, obsidian
Replace [emotion] with: fierce, noble, mysterious

[OUTPUT EXAMPLE]
[Image showing result from this prompt]

[TIPS]
💡 Use "cinematic" for dramatic lighting
💡 Add "trending on ArtStation" for quality boost
```

---

### 11. DELIVERY & DISTRIBUTION

#### How Users Receive Product

**Option 1: PDF via Gumroad**
- User purchases
- Instant download of PDF file
- Can print or view on screen
- Fully formatted, ready to use

**Option 2: Notion Template**
- User purchases
- Receives Notion share link
- Duplicates into their workspace
- Can edit, customize, organize as they like
- Searchable, interactive

**Option 3: Email Sequence**
- Purchase triggers email automation
- Email 1: Welcome + download link
- Email 2 (day 1): Getting started guide
- Email 3 (day 3): Tips for best results
- Email 4 (day 7): Advanced techniques

#### File Naming for Distribution
```
Format: [PackName]_[YourName].pdf

Examples:
ContentCreationPrompts_JohnSmith.pdf
BusinessStrategyFramework_SarahChen.pdf
AIArtPrompts_MarcusLee.pdf

Never:
Prompts.pdf (too generic)
Template_v2_FINAL_REVISED.pdf (confusing)
```

---

### 12. QUALITY ASSURANCE CHECKLIST

#### Content Quality
- [ ] All 5-7 framework prompts written (specific, detailed)
- [ ] All 8-12 specialized prompts written (use-case specific)
- [ ] All prompts tested with ChatGPT and Claude (actual outputs captured)
- [ ] All outputs reviewed for quality (good examples)
- [ ] Before/after examples demonstrate value clearly
- [ ] All variations clearly documented
- [ ] Model-specific notes included (ChatGPT vs. Claude differences)
- [ ] 2-3 workflow chains created and tested
- [ ] All [BRACKETS] consistently marked (variables)
- [ ] {CURLY BRACES} consistently used (optional sections)

#### Formatting & Design
- [ ] Consistent typography throughout (11pt body, 16pt titles)
- [ ] Color palette applied consistently
- [ ] All prompts in gray boxes (#F3F4F6)
- [ ] All tips in green boxes (#F0FDF4)
- [ ] All warnings in red boxes (#FEF2F2)
- [ ] All examples have prompt + output comparison
- [ ] Page headers and footers consistent
- [ ] No orphaned headers (header + content on same page)
- [ ] Margins consistent (1 inch all sides)
- [ ] Line spacing consistent (1.5)

#### Accessibility
- [ ] Color contrast checked (minimum 4.5:1)
- [ ] No text smaller than 10pt
- [ ] Proper heading structure (H1, H2, H3)
- [ ] Important info uses multiple signals (color + shape)
- [ ] Alt text for images (if any)
- [ ] PDF is searchable (not scanned image)
- [ ] Fonts embedded in PDF

#### Navigation & Structure
- [ ] Table of contents complete and accurate
- [ ] All TOC links working (PDF)
- [ ] Page numbers consistent
- [ ] Bookmarks created (PDF)
- [ ] Index included (searchable terms)
- [ ] Cross-references work
- [ ] External links active and current
- [ ] No dead links

#### File Technical
- [ ] PDF file size under 10 MB
- [ ] PDF opens without errors
- [ ] All fonts display correctly
- [ ] Colors render correctly (RGB/CMYK)
- [ ] Images at 300 DPI (if included)
- [ ] No placeholder text remaining
- [ ] No debug/test content visible
- [ ] File named appropriately

#### Content Verification
- [ ] All prompts are actually useful (would you buy this?)
- [ ] All outputs are high-quality examples
- [ ] No plagiarized content
- [ ] No overpromising (realistic expectations)
- [ ] Instructions are clear and tested
- [ ] Examples match use cases
- [ ] Tone consistent throughout (professional but approachable)
- [ ] No grammatical errors or typos

---

## DESIGN SUMMARY

### Key Design Decisions
✓ **Clean, professional layout** (not flashy)
✓ **Scannable format** (users skim, then read deep)
✓ **Clear prompt structure** (role, context, task, output)
✓ **Real examples** (before/after with actual outputs)
✓ **Multiple formats** (PDF, Markdown, Notion options)
✓ **Searchable & navigable** (quick reference possible)

### User Experience Flow
1. **Purchase** → Get PDF instantly
2. **Skim** → Quick Start (1 page) gives immediate value
3. **Explore** → Table of contents shows what's available
4. **Reference** → Bookmark specific prompts
5. **Use** → Copy prompt to ChatGPT/Claude
6. **Customize** → Modify for specific use case
7. **Iterate** → Advanced section teaches customization

### Expected User Outcomes
- ✓ Can run first prompt in < 5 minutes
- ✓ Gets useful output first try
- ✓ Understands how to customize for own use
- ✓ Can chain prompts for larger projects
- ✓ Becomes more effective with LLMs

---

## HANDOFF FOR MARKETING

### Screenshot/Preview Content
1. **Cover page image** (for Gumroad listing)
2. **Sample prompt page** (shows format/quality)
3. **Example output page** (shows value)
4. **Before/after graphic** (proves transformation)

### Sales Copy Points
- ✓ Specific niche (not generic prompts)
- ✓ Framework system (not random prompts)
- ✓ Real, tested outputs (social proof)
- ✓ Model-optimized (for ChatGPT and Claude)
- ✓ Immediate value (use first prompt today)
- ✓ Customizable (adapt to your needs)

---

## SUMMARY

**Notion Templates**: Web-based, interactive, databases, 5-7 day build
**AI Prompts**: PDF/Markdown, text-based, framework + specialized, 3-5 day build
**Digital Planners**: PDF, design-heavy, tablet-optimized, 7-10 day build
**Design Templates**: Figma/Canva, component-focused, reusable, 7-14 day build

**Expected Build Time**: 3-5 days per prompt pack
**Expected Launch Price**: $12-19 (Professional tier)
**Expected Monthly Sales**: 10-20 units first month, growing to 30-50+ by month 3