import { beforeEach, describe, expect, it } from "vitest";
import { _setDb } from "@/lib/db";
import { seed } from "@/lib/seed";
import * as tickets from "@/services/tickets";
import * as helpcenter from "@/services/helpcenter";
import { decodeSession, encodeSession } from "@/lib/auth";

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
    const v = tickets.getForEmployee("INC-20311", "e1");
    expect(v?.overdue).toBe(true);
    expect(v?.slaLabel).toBe("3 dias úteis");
  });

  it("chamado resolvido há 4 dias pode ser reaberto; há 20 dias não", () => {
    expect(tickets.getForEmployee("INC-20150", "e1")?.reopenable).toBe(true);
    expect(tickets.getForEmployee("REQ-10460", "e2")?.reopenable).toBe(false);
  });
});

describe("privacidade", () => {
  it("não devolve chamado de outro funcionário", () => {
    expect(tickets.getForEmployee("INC-20311", "e2")).toBeUndefined();
    expect(tickets.listByEmployee("e3").map((t) => t.id)).toEqual(["INC-20401"]);
    expect(() => tickets.addComment("INC-20311", "e2", "Bruno", "x")).toThrow();
  });
});

describe("duplicidade", () => {
  it("encontra chamado aberto parecido", () => {
    const m = tickets.findSimilar("e1", "meu notebook continua lento depois da atualização do windows");
    expect(m[0]?.ticket.id).toBe("INC-20311");
  });

  it("não aponta duplicado para assunto diferente", () => {
    expect(tickets.findSimilar("e1", "impressora sem toner no segundo andar")).toEqual([]);
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
      affected: "Carla Mendes",
      requesterId: "e3",
      requesterName: "Carla Mendes",
    });
    expect(t.id).toBe("REQ-10461");
    expect(t.status).toBe("Aberto");
    expect(t.open).toBe(true);
  });

  it("reabre resolvido recente e recusa resolvido antigo", () => {
    expect(tickets.reopen("INC-20150", "e1", "Ana", "bloqueou de novo").status).toBe("Aberto");
    expect(() => tickets.reopen("REQ-10460", "e2", "Bruno", "x")).toThrow(/7 dias/);
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

describe("sessão assinada", () => {
  it("aceita token válido e rejeita adulterado", () => {
    const tok = encodeSession("e1");
    expect(decodeSession(tok)).toBe("e1");
    const [payload, sig] = tok.split(".");
    const forged = Buffer.from(JSON.stringify({ employeeId: "a1" })).toString("base64url");
    expect(decodeSession(`${forged}.${sig}`)).toBeUndefined();
    expect(decodeSession(`${payload}.x`)).toBeUndefined();
  });
});
