import { beforeEach, describe, expect, it } from "vitest";
import { _setDb } from "@/lib/db";
import { seed } from "@/lib/seed";
import * as tickets from "@/services/tickets";
import * as helpcenter from "@/services/helpcenter";
import { signSession, verifySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

process.env.TICKET_OUTAGE_RATE = "0";

beforeEach(() => _setDb(seed()));

describe("regras de prazo", () => {
  it("soma horas úteis pulando fim de semana", () => {
    // sexta 17:00 + 4h úteis (17→18, seg 8→11) -> segunda 11:00
    const due = tickets.addBusinessHours(new Date("2026-10-30T17:00:00"), 4);
    expect(due.getDay()).toBe(1);
    expect(due.getHours()).toBe(11);
  });

  it("marca chamado aberto há 6 dias com prioridade média como vencido", () => {
    const v = tickets.getForEmployee("INC-20311", "admin");
    expect(v?.overdue).toBe(true);
    expect(v?.slaLabel).toBe("3 dias úteis");
  });

  it("chamado resolvido há 4 dias pode ser reaberto; há 20 dias não", () => {
    expect(tickets.getForEmployee("INC-20150", "admin")?.reopenable).toBe(true);
    expect(tickets.getForEmployee("REQ-10460", "admin")?.reopenable).toBe(false);
  });
});

describe("privacidade", () => {
  it("não devolve chamado de outro funcionário", () => {
    expect(tickets.getForEmployee("INC-20311", "teste")).toBeUndefined();
    expect(tickets.listByEmployee("teste")).toEqual([]);
    expect(() => tickets.addComment("INC-20311", "teste", "Teste", "x")).toThrow();
  });
});

describe("duplicidade", () => {
  it("encontra chamado aberto parecido", () => {
    const m = tickets.findSimilar("admin", "meu notebook continua lento depois da atualização do windows");
    expect(m[0]?.ticket.id).toBe("INC-20311");
  });

  it("não aponta duplicado para assunto diferente", () => {
    expect(tickets.findSimilar("admin", "impressora sem toner no segundo andar")).toEqual([]);
  });
});

describe("criação e reabertura", () => {
  it("cria com id sequencial e histórico", () => {
    const t = tickets.create({
      type: "REQ",
      title: "Teclado novo",
      description: "Teclado com teclas falhando",
      category: "Hardware",
      priority: "Baixa",
      affected: "Usuário Teste",
      requesterId: "teste",
      requesterName: "Usuário Teste",
    });
    expect(t.id).toBe("REQ-10461");
    expect(t.status).toBe("Aberto");
    expect(t.open).toBe(true);
  });

  it("reabre resolvido recente e recusa resolvido antigo", () => {
    expect(tickets.reopen("INC-20150", "admin", "Admin", "bloqueou de novo").status).toBe("Aberto");
    expect(() => tickets.reopen("REQ-10460", "admin", "Admin", "x")).toThrow(/7 dias/);
  });
});

describe("indisponibilidade simulada", () => {
  it("withRetry tenta de novo e desiste depois de N vezes", async () => {
    let calls = 0;
    const flaky = () => {
      calls++;
      if (calls < 3) throw new tickets.TicketServiceUnavailable();
      return "ok";
    };
    await expect(tickets.withRetry(flaky, 3, 1)).resolves.toBe("ok");
    calls = 0;
    await expect(tickets.withRetry(() => flaky() && (() => { throw new tickets.TicketServiceUnavailable(); })(), 2, 1)).rejects.toBeInstanceOf(
      tickets.TicketServiceUnavailable,
    );
  });
});

describe("central de ajuda", () => {
  it("acha o artigo da VPN 809 e do horário", () => {
    expect(helpcenter.search("vpn erro 809")[0]?.id).toBe("kb-1");
    expect(helpcenter.search("que horas o service desk atende")[0]?.id).toBe("kb-2");
    expect(helpcenter.search("")).toEqual([]);
  });
});

describe("sessão JWT", () => {
  it("aceita token válido e rejeita adulterado ou vencido", async () => {
    const tok = await signSession("teste");
    expect((await verifySession(tok))?.employeeId).toBe("teste");
    const [h, , sig] = tok.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", exp: 9e9 })).toString("base64url");
    expect(await verifySession(`${h}.${forged}.${sig}`)).toBeUndefined();
    expect(await verifySession(await signSession("teste", -10))).toBeUndefined();
    expect(await verifySession(undefined)).toBeUndefined();
  });
});

describe("senha", () => {
  it("hash scrypt confere a senha certa e rejeita a errada", () => {
    const h = hashPassword("teste123");
    expect(h).not.toContain("teste123");
    expect(verifyPassword("teste123", h)).toBe(true);
    expect(verifyPassword("teste124", h)).toBe(false);
    expect(verifyPassword("x", "lixo")).toBe(false);
  });
});
