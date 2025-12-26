import { Router } from 'express';
import { TemplateCategory } from '../../../types';
import { isTemplateCategory } from '../definitions/schemas';
import { runDailySwarm } from '../runners/dailySwarm';
import { runResearch } from '../runners/researcher';

export const agentRoutes = Router();

agentRoutes.post('/orchestrate', async (req, res) => {
  const { message, context, mode } = req.body as { message?: unknown; context?: unknown; mode?: unknown };
  if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'Invalid or missing field: message' });

  try {
    const { runOrchestrate18 } = await import('../runners/orchestrate18');
    const result = await runOrchestrate18({
      message: message.trim(),
      context: typeof context === 'object' && context ? (context as any) : {},
      mode: mode === 'fast' ? 'fast' : 'full',
    });
    return res.status(200).json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Orchestration failed';
    return res.status(500).json({ error: msg });
  }
});

agentRoutes.post('/generate', async (req, res) => {
  const { category } = req.body as { category?: unknown };
  if (!isTemplateCategory(category)) return res.status(400).json({ error: 'Invalid or missing field: category' });

  try {
    const result = await runDailySwarm(category as TemplateCategory);
    return res.status(200).json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Agent generation failed';
    return res.status(500).json({ error: msg });
  }
});

agentRoutes.post('/research', async (req, res) => {
  const { category, force } = req.body as { category?: unknown; force?: boolean };
  if (!isTemplateCategory(category)) return res.status(400).json({ error: 'Invalid or missing field: category' });

  try {
    const result = await runResearch({ category: category as TemplateCategory, force: !!force });
    return res.status(200).json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Research failed';
    return res.status(500).json({ error: msg });
  }
});
