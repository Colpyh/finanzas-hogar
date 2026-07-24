/**
 * @jest-environment node
 *
 * Tests for POST /api/webhooks/email/[householdId]/route.ts
 * Covers spec scenarios 1.1–1.8
 *
 * Requires node environment for Web Fetch API globals (Request, Response).
 */
export {};

const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440005";
const UUID_PENDING = "550e8400-e29b-41d4-a716-446655440006";
const TEST_SECRET = "abc123testsecret";

// Mock createServiceClient
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();
const mockInsert = jest.fn();
const mockValues = jest.fn();
const mockSingle = jest.fn();

const buildSupabaseChain = (overrides: Record<string, jest.Mock> = {}) => ({
  from: mockFrom,
  ...overrides,
});

jest.mock("@/shared/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

jest.mock("@/email-inbound/parser", () => ({
  parseBciEmail: jest.fn(),
}));

// Suppress server-only for test environment
jest.mock("server-only", () => ({}));

const BCI_PAYLOAD = {
  From: "contacto@bci.cl",
  FromName: "BCI",
  Subject: "Compra con tarjeta débito",
  MessageID: "unique-message-id-123",
  Date: "Mon, 19 Apr 2026 09:53:00 -0400",
  TextBody: `
Número tarjeta débito: ****5616
Monto: $4.000
Fecha: 19/04/2026
Hora: 09:53 horas
Comercio: MUNICH
`,
  HtmlBody: "<html>BCI email body</html>",
};

const NON_BCI_PAYLOAD = {
  From: "noreply@gmail.com",
  FromName: "Gmail",
  Subject: "Test",
  MessageID: "non-bci-message-id",
  TextBody: "Not a BCI email",
};

// CloudMailin "JSON Normalized" shape — headers en minúsculas, cuerpo en `plain`
const CLOUDMAILIN_BCI_PAYLOAD = {
  envelope: {
    to: "abc123@cloudmailin.net",
    from: "enviodigital@bci.cl",
    recipients: ["abc123@cloudmailin.net"],
  },
  headers: {
    subject: "Compra con tarjeta débito",
    from: "BCI <enviodigital@bci.cl>",
    date: "Mon, 19 Apr 2026 09:53:00 -0400",
    message_id: "<cloudmailin-msg-456@bci.cl>",
  },
  plain: `
Número tarjeta débito: ****5616
Monto: $4.000
Fecha: 19/04/2026
Hora: 09:53 horas
Comercio: MUNICH
`,
  html: "<html>BCI email body</html>",
};

function makeRequest(
  body: unknown,
  secret: string | null,
  householdId = UUID_HOUSEHOLD
): Request {
  const url = secret
    ? `https://example.com/api/webhooks/email/${householdId}?secret=${secret}`
    : `https://example.com/api/webhooks/email/${householdId}`;
  return new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/webhooks/email/[householdId]", () => {
  let POST: typeof import("@/app/api/webhooks/email/[householdId]/route").POST;
  let createServiceClient: jest.Mock;
  let parseBciEmail: jest.Mock;

  beforeAll(() => {
    process.env.WEBHOOK_SECRET = TEST_SECRET;
  });

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env.WEBHOOK_SECRET = TEST_SECRET;

    // Re-import after resetModules
    const serviceModule = await import("@/shared/lib/supabase/service");
    createServiceClient = serviceModule.createServiceClient as jest.Mock;

    const parserModule = await import("@/email-inbound/parser");
    parseBciEmail = parserModule.parseBciEmail as jest.Mock;

    // Default parser returns a valid parsed email
    parseBciEmail.mockReturnValue({
      amount: 4000,
      date: "2026-04-19",
      time: "09:53",
      merchant: "MUNICH",
      cardLast4: "5616",
    });

    const routeModule = await import(
      "@/app/api/webhooks/email/[householdId]/route"
    );
    POST = routeModule.POST;
  });

  // Scenario 1.2 — missing secret → 401
  it("returns 401 when secret is missing", async () => {
    const req = makeRequest(BCI_PAYLOAD, null);
    const res = await POST(req, {
      params: Promise.resolve({ householdId: UUID_HOUSEHOLD }),
    });
    expect(res.status).toBe(401);
  });

  // Scenario 1.3 — wrong secret → 401
  it("returns 401 when secret is wrong", async () => {
    const req = makeRequest(BCI_PAYLOAD, "wrongsecret");
    const res = await POST(req, {
      params: Promise.resolve({ householdId: UUID_HOUSEHOLD }),
    });
    expect(res.status).toBe(401);
  });

  // Scenario 1.8 — payload > 1MB → 413
  it("returns 413 for payload exceeding 1MB", async () => {
    const largeBody = "x".repeat(1_100_000);
    const url = `https://example.com/api/webhooks/email/${UUID_HOUSEHOLD}?secret=${TEST_SECRET}`;
    const req = new Request(url, {
      method: "POST",
      body: largeBody,
    });
    const res = await POST(req, {
      params: Promise.resolve({ householdId: UUID_HOUSEHOLD }),
    });
    expect(res.status).toBe(413);
  });

  // Scenario 1.7 — unknown household → 200 skipped
  it("returns 200 with skipped=unknown_household for unknown householdId", async () => {
    const svc = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null }),
      }),
    };
    createServiceClient.mockReturnValue(svc);

    const req = makeRequest(BCI_PAYLOAD, TEST_SECRET, "00000000-0000-0000-0000-000000000000");
    const res = await POST(req, {
      params: Promise.resolve({
        householdId: "00000000-0000-0000-0000-000000000000",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("unknown_household");
  });

  // Scenario 1.4 — non-BCI email → 200 skipped
  it("returns 200 with skipped=not_bci for non-BCI email", async () => {
    const svc = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { id: UUID_HOUSEHOLD } }),
      }),
    };
    createServiceClient.mockReturnValue(svc);

    const req = makeRequest(NON_BCI_PAYLOAD, TEST_SECRET);
    const res = await POST(req, {
      params: Promise.resolve({ householdId: UUID_HOUSEHOLD }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("not_bci");
  });

  // Scenario 1.5 — duplicate hash → 200 skipped
  it("returns 200 with skipped=duplicate for duplicate message", async () => {
    let callCount = 0;
    const svc = {
      from: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // household check
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: { id: UUID_HOUSEHOLD } }),
          };
        }
        // duplicate check
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest
            .fn()
            .mockResolvedValue({ data: { id: UUID_PENDING } }),
        };
      }),
    };
    createServiceClient.mockReturnValue(svc);

    const req = makeRequest(BCI_PAYLOAD, TEST_SECRET);
    const res = await POST(req, {
      params: Promise.resolve({ householdId: UUID_HOUSEHOLD }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("duplicate");
  });

  // Scenario 1.6 — malformed payload → 200 skipped
  it("returns 200 with skipped=parse_error for malformed payload", async () => {
    const req = new Request(
      `https://example.com/api/webhooks/email/${UUID_HOUSEHOLD}?secret=${TEST_SECRET}`,
      {
        method: "POST",
        body: JSON.stringify({ invalid: "no From field" }),
      }
    );
    const res = await POST(req, {
      params: Promise.resolve({ householdId: UUID_HOUSEHOLD }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("parse_error");
  });

  // Scenario 1.1 — valid BCI payload → 200 + insert
  it("returns 200 with pendingId for valid BCI payload", async () => {
    let callCount = 0;
    const svc = {
      from: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // household check
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: { id: UUID_HOUSEHOLD } }),
          };
        }
        if (callCount === 2) {
          // duplicate check — no duplicate
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          };
        }
        // insert
        return {
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: UUID_PENDING }, error: null }),
        };
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: { id: UUID_PENDING }, error: null }),
      }),
    };
    createServiceClient.mockReturnValue(svc);

    const req = makeRequest(BCI_PAYLOAD, TEST_SECRET);
    const res = await POST(req, {
      params: Promise.resolve({ householdId: UUID_HOUSEHOLD }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  // CloudMailin — valid BCI payload → 200 + insert
  it("returns 200 ok for a valid CloudMailin BCI payload", async () => {
    let callCount = 0;
    const svc = {
      from: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: { id: UUID_HOUSEHOLD } }),
          };
        }
        if (callCount === 2) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: UUID_PENDING }, error: null }),
        };
      }),
    };
    createServiceClient.mockReturnValue(svc);

    const req = makeRequest(CLOUDMAILIN_BCI_PAYLOAD, TEST_SECRET);
    const res = await POST(req, {
      params: Promise.resolve({ householdId: UUID_HOUSEHOLD }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // El parser debe recibir el cuerpo `plain` de CloudMailin
    expect(parseBciEmail).toHaveBeenCalledWith(
      expect.stringContaining("Comercio: MUNICH")
    );
  });

  // Correo de BCI que NO es compra (parse falla + asunto no es de compra) → skipped
  it("returns skipped=not_purchase for a BCI transfer email", async () => {
    parseBciEmail.mockReturnValue(null);
    let callCount = 0;
    const svc = {
      from: jest.fn().mockImplementation(() => {
        callCount++;
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: callCount === 1 ? { id: UUID_HOUSEHOLD } : null,
          }),
        };
      }),
    };
    createServiceClient.mockReturnValue(svc);

    const payload = {
      ...BCI_PAYLOAD,
      Subject: "Aviso de Transferencia de Fondos Programada",
      TextBody: "Monto transferido $5.000 ...",
    };
    const req = makeRequest(payload, TEST_SECRET);
    const res = await POST(req, {
      params: Promise.resolve({ householdId: UUID_HOUSEHOLD }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("not_purchase");
  });

  // Parse falla PERO el asunto es de compra → se guarda igual (detectar drift de formato)
  it("still inserts when parse fails but subject is a purchase notification", async () => {
    parseBciEmail.mockReturnValue(null);
    let callCount = 0;
    const svc = {
      from: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: callCount === 1 ? { id: UUID_HOUSEHOLD } : null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: UUID_PENDING }, error: null }),
        };
      }),
    };
    createServiceClient.mockReturnValue(svc);

    const payload = {
      ...BCI_PAYLOAD,
      Subject: "Fwd: Notificación de uso de tu tarjeta de débito",
      TextBody: "formato nuevo desconocido",
    };
    const req = makeRequest(payload, TEST_SECRET);
    const res = await POST(req, {
      params: Promise.resolve({ householdId: UUID_HOUSEHOLD }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.pendingId).toBe(UUID_PENDING);
  });

  // CloudMailin — non-BCI sender → skipped
  it("returns skipped=not_bci for a CloudMailin payload from another sender", async () => {
    const svc = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { id: UUID_HOUSEHOLD } }),
      }),
    };
    createServiceClient.mockReturnValue(svc);

    const payload = {
      ...CLOUDMAILIN_BCI_PAYLOAD,
      envelope: { ...CLOUDMAILIN_BCI_PAYLOAD.envelope, from: "spam@otro.com" },
      headers: { ...CLOUDMAILIN_BCI_PAYLOAD.headers, from: "Otro <spam@otro.com>" },
    };
    const req = makeRequest(payload, TEST_SECRET);
    const res = await POST(req, {
      params: Promise.resolve({ householdId: UUID_HOUSEHOLD }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("not_bci");
  });
});
