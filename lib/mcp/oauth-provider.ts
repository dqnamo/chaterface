import "server-only";

import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { decryptMcpValue, encryptMcpValue } from "@/lib/mcp/crypto";
import {
  getMcpOauthState,
  type McpConnectionRecord,
  upsertMcpOauthState,
} from "@/lib/mcp/records";

export class PersistentFactoryMcpOAuthProvider implements OAuthClientProvider {
  constructor(
    private readonly connection: McpConnectionRecord,
    private readonly callbackUrl: string,
  ) {}

  get redirectUrl() {
    return this.callbackUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: `Software Factory ${this.connection.name}`,
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [this.callbackUrl],
      response_types: ["code"],
      scope: this.connection.scopes || undefined,
      token_endpoint_auth_method: "none",
    };
  }

  async state() {
    const state = crypto.randomUUID();

    await upsertMcpOauthState(this.connection.id, { state });

    return state;
  }

  async clientInformation() {
    const state = await this.loadState();

    return decryptMcpValue<OAuthClientInformationMixed>(
      state?.encryptedClientInformation,
    );
  }

  async saveClientInformation(clientInformation: OAuthClientInformationMixed) {
    await upsertMcpOauthState(this.connection.id, {
      encryptedClientInformation: encryptMcpValue(clientInformation),
    });
  }

  async tokens() {
    const state = await this.loadState();

    return decryptMcpValue<OAuthTokens>(state?.encryptedTokens);
  }

  async saveTokens(tokens: OAuthTokens) {
    await upsertMcpOauthState(this.connection.id, {
      encryptedTokens: encryptMcpValue(tokens),
    });
  }

  async redirectToAuthorization(authorizationUrl: URL) {
    await upsertMcpOauthState(this.connection.id, {
      authorizationUrl: authorizationUrl.toString(),
    });
  }

  async saveCodeVerifier(codeVerifier: string) {
    await upsertMcpOauthState(this.connection.id, {
      encryptedCodeVerifier: encryptMcpValue(codeVerifier),
    });
  }

  async codeVerifier() {
    const state = await this.loadState();
    const codeVerifier = decryptMcpValue<string>(state?.encryptedCodeVerifier);

    if (!codeVerifier) {
      throw new Error("MCP OAuth code verifier is missing");
    }

    return codeVerifier;
  }

  async saveDiscoveryState(discoveryState: OAuthDiscoveryState) {
    await upsertMcpOauthState(this.connection.id, {
      discoveryState,
    });
  }

  async discoveryState() {
    const state = await this.loadState();

    return state?.discoveryState as OAuthDiscoveryState | undefined;
  }

  async invalidateCredentials(
    scope: "all" | "client" | "discovery" | "tokens" | "verifier",
  ) {
    const values: Record<string, null | undefined> = {};

    if (scope === "all" || scope === "client") {
      values.encryptedClientInformation = null;
    }

    if (scope === "all" || scope === "tokens") {
      values.encryptedTokens = null;
    }

    if (scope === "all" || scope === "verifier") {
      values.encryptedCodeVerifier = null;
    }

    if (scope === "all" || scope === "discovery") {
      values.discoveryState = null;
    }

    await upsertMcpOauthState(this.connection.id, values);
  }

  private async loadState() {
    return getMcpOauthState(this.connection.id);
  }
}
