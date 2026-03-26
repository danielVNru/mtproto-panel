import { Router, Response } from 'express';
import { pool } from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Get all proxies from all nodes
router.get('/all', async (req: AuthRequest, res: Response) => {
  try {
    const nodesResult = await pool.query('SELECT * FROM nodes ORDER BY id');
    const nodes = nodesResult.rows;

    const results = await Promise.allSettled(
      nodes.map(async (node) => {
        const url = `http://${node.ip}:${node.port}/api/proxies`;
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${node.token}`,
          },
        });
        const proxies = await response.json();
        return {
          nodeId: node.id,
          nodeName: node.name,
          nodeIp: node.ip,
          proxies: Array.isArray(proxies) ? proxies : [],
        };
      })
    );

    const data = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: `Failed to fetch proxies: ${error.message}` });
  }
});

export default router;
