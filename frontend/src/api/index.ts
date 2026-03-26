const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Auth
export async function login(username: string, password: string) {
  const data = await request<{ token: string; user: { id: number; username: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('token', data.token);
  return data;
}

export async function getMe() {
  return request<{ user: { userId: number; username: string } }>('/auth/me');
}

export function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Nodes
export interface NodeData {
  id: number;
  name: string;
  ip: string;
  port: number;
  token?: string;
  created_at: string;
  online?: boolean;
}

export async function getNodes(): Promise<NodeData[]> {
  return request<NodeData[]>('/nodes');
}

export async function getNode(id: number): Promise<NodeData> {
  return request<NodeData>(`/nodes/${id}`);
}

export async function createNode(data: { name?: string; ip: string; port: number; token: string }) {
  return request<NodeData>('/nodes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateNode(id: number, data: { name?: string; ip?: string; port?: number; token?: string }) {
  return request<NodeData>(`/nodes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteNode(id: number) {
  return request<{ success: boolean }>(`/nodes/${id}`, { method: 'DELETE' });
}

export async function checkNodeHealth(id: number): Promise<{ online: boolean }> {
  return request<{ online: boolean }>(`/nodes/${id}/health`);
}

export async function checkNodeConnection(ip: string, port: number, token: string): Promise<{ online: boolean }> {
  return request<{ online: boolean }>('/nodes/check-health', {
    method: 'POST',
    body: JSON.stringify({ ip, port, token }),
  });
}

export async function updateNodeService(id: number): Promise<{ success: boolean; output?: string; error?: string }> {
  return request<{ success: boolean; output?: string; error?: string }>(`/nodes/${id}/update`, {
    method: 'POST',
  });
}

// Proxies
export interface ConnectedIpInfo {
  ip: string;
  country?: string;
  countryCode?: string;
}

export interface ProxyData {
  id: string;
  name: string;
  note: string;
  port: number;
  secret: string;
  domain: string;
  containerName: string;
  status: 'running' | 'stopped' | 'paused' | 'error';
  createdAt: string;
  tag?: string;
  trafficUp: number;
  trafficDown: number;
  connectedIps: string[];
  maxConnections?: number;
}

export interface ProxyStatsData {
  id: string;
  containerName: string;
  status: string;
  cpuPercent: string;
  memoryUsage: string;
  memoryLimit: string;
  networkRx: string;
  networkTx: string;
  networkRxBytes: number;
  networkTxBytes: number;
  uptime: string;
  connectedIps: ConnectedIpInfo[];
}

export interface CreateProxyRequest {
  port?: number;
  secret?: string;
  domain?: string;
  tag?: string;
  name?: string;
  note?: string;
  maxConnections?: number;
}

export async function getProxies(nodeId: number): Promise<ProxyData[]> {
  return request<ProxyData[]>(`/nodes/${nodeId}/proxies`);
}

export async function getAllProxies(): Promise<{ nodeId: number; nodeName: string; nodeIp: string; proxies: ProxyData[] }[]> {
  return request<{ nodeId: number; nodeName: string; nodeIp: string; proxies: ProxyData[] }[]>('/proxies/all');
}

export async function createProxy(nodeId: number, data: CreateProxyRequest) {
  return request<ProxyData>(`/nodes/${nodeId}/proxies`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProxy(nodeId: number, proxyId: string, data: { domain?: string; tag?: string; name?: string; note?: string; maxConnections?: number }) {
  return request<ProxyData>(`/nodes/${nodeId}/proxies/${proxyId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProxy(nodeId: number, proxyId: string) {
  return request<{ success: boolean }>(`/nodes/${nodeId}/proxies/${proxyId}`, { method: 'DELETE' });
}

export async function getProxyStats(nodeId: number, proxyId: string): Promise<ProxyStatsData> {
  return request<ProxyStatsData>(`/nodes/${nodeId}/proxies/${proxyId}/stats`);
}

export async function getProxyLink(nodeId: number, proxyId: string): Promise<string> {
  const data = await request<{ link: string }>(`/nodes/${nodeId}/proxies/${proxyId}/link`);
  return data.link;
}

export async function pauseProxy(nodeId: number, proxyId: string): Promise<ProxyData> {
  return request<ProxyData>(`/nodes/${nodeId}/proxies/${proxyId}/pause`, { method: 'POST' });
}

export async function unpauseProxy(nodeId: number, proxyId: string): Promise<ProxyData> {
  return request<ProxyData>(`/nodes/${nodeId}/proxies/${proxyId}/unpause`, { method: 'POST' });
}

// Node domains
export async function getNodeDomains(nodeId: number): Promise<string[]> {
  const data = await request<{ domains: string[] }>(`/nodes/${nodeId}/domains`);
  return data.domains;
}

export async function updateNodeDomains(nodeId: number, domains: string[]): Promise<string[]> {
  const data = await request<{ domains: string[] }>(`/nodes/${nodeId}/domains`, {
    method: 'PUT',
    body: JSON.stringify({ domains }),
  });
  return data.domains;
}

// Node IP blacklist
export async function getNodeBlacklist(nodeId: number): Promise<string[]> {
  const data = await request<{ ips: string[] }>(`/nodes/${nodeId}/blacklist`);
  return data.ips;
}

export async function updateNodeBlacklist(nodeId: number, ips: string[]): Promise<string[]> {
  const data = await request<{ ips: string[] }>(`/nodes/${nodeId}/blacklist`, {
    method: 'PUT',
    body: JSON.stringify({ ips }),
  });
  return data.ips;
}
