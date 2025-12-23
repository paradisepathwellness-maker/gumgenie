export type JsonRpcRequest<TParams = unknown> = {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: TParams;
};

export type JsonRpcResponse<TResult = unknown> = {
  jsonrpc: '2.0';
  id: string | number;
  result?: TResult;
  error?: { code: number; message: string; data?: unknown };
};

export type JsonRpcNotification<TParams = unknown> = {
  jsonrpc: '2.0';
  method: string;
  params?: TParams;
};

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export type McpToolsListResult = {
  tools: McpTool[];
};

export type McpContentPart =
  | { type: 'text'; text: string }
  | { type: string; [k: string]: unknown };

export type McpCallToolResult = {
  content?: McpContentPart[];
  isError?: boolean;
};
