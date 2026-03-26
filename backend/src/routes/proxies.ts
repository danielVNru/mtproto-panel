import { Router, Response } from 'express';
import { pool } from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

async function getNodeWithToken(nodeId: string) {
  const result = await pool.query('SELECT * FROM nodes WHERE id = $1', [nodeId]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

async function proxyToNode(
  node: { ip: string; port: number; token: string },
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; data: any }> {
  const url = `http://${node.ip}:${node.port}/api/proxies${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${node.token}`,
  };

  const options: RequestInit = { method, headers };
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

// List proxies on a node
router.get('/:nodeId/proxies', async (req: AuthRequest, res: Response) => {
  try {
    const node = await getNodeWithToken(req.params.nodeId);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    const result = await proxyToNode(node, 'GET', '');
    res.status(result.status).json(result.data);
  } catch (error: any) {
    res.status(502).json({ error: `Failed to connect to node: ${error.message}` });
  }
});

// Create proxy on a node
router.post('/:nodeId/proxies', async (req: AuthRequest, res: Response) => {
  try {
    const node = await getNodeWithToken(req.params.nodeId);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    const result = await proxyToNode(node, 'POST', '', req.body);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    res.status(502).json({ error: `Failed to connect to node: ${error.message}` });
  }
});

// Get proxy details
router.get('/:nodeId/proxies/:proxyId', async (req: AuthRequest, res: Response) => {
  try {
    const node = await getNodeWithToken(req.params.nodeId);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    const result = await proxyToNode(node, 'GET', `/${req.params.proxyId}`);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    res.status(502).json({ error: `Failed to connect to node: ${error.message}` });
  }
});

// Update proxy
router.put('/:nodeId/proxies/:proxyId', async (req: AuthRequest, res: Response) => {
  try {
    const node = await getNodeWithToken(req.params.nodeId);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    const result = await proxyToNode(node, 'PUT', `/${req.params.proxyId}`, req.body);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    res.status(502).json({ error: `Failed to connect to node: ${error.message}` });
  }
});

// Delete proxy
router.delete('/:nodeId/proxies/:proxyId', async (req: AuthRequest, res: Response) => {
  try {
    const node = await getNodeWithToken(req.params.nodeId);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    const result = await proxyToNode(node, 'DELETE', `/${req.params.proxyId}`);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    res.status(502).json({ error: `Failed to connect to node: ${error.message}` });
  }
});

// Get proxy stats
router.get('/:nodeId/proxies/:proxyId/stats', async (req: AuthRequest, res: Response) => {
  try {
    const node = await getNodeWithToken(req.params.nodeId);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    const result = await proxyToNode(node, 'GET', `/${req.params.proxyId}/stats`);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    res.status(502).json({ error: `Failed to connect to node: ${error.message}` });
  }
});

// Get proxy link
router.get('/:nodeId/proxies/:proxyId/link', async (req: AuthRequest, res: Response) => {
  try {
    const node = await getNodeWithToken(req.params.nodeId);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    const result = await proxyToNode(node, 'GET', `/${req.params.proxyId}/link?server_ip=${node.ip}`);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    res.status(502).json({ error: `Failed to connect to node: ${error.message}` });
  }
});

// Pause proxy
router.post('/:nodeId/proxies/:proxyId/pause', async (req: AuthRequest, res: Response) => {
  try {
    const node = await getNodeWithToken(req.params.nodeId);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    const result = await proxyToNode(node, 'POST', `/${req.params.proxyId}/pause`);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    res.status(502).json({ error: `Failed to connect to node: ${error.message}` });
  }
});

// Unpause proxy
router.post('/:nodeId/proxies/:proxyId/unpause', async (req: AuthRequest, res: Response) => {
  try {
    const node = await getNodeWithToken(req.params.nodeId);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    const result = await proxyToNode(node, 'POST', `/${req.params.proxyId}/unpause`);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    res.status(502).json({ error: `Failed to connect to node: ${error.message}` });
  }
});

export default router;
