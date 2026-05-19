import { handleFactoryMcpGatewayRequest } from "@/lib/mcp/gateway";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  return handleFactoryMcpGatewayRequest(request);
}

export async function GET(request: Request) {
  return handleFactoryMcpGatewayRequest(request);
}

export async function POST(request: Request) {
  return handleFactoryMcpGatewayRequest(request);
}
