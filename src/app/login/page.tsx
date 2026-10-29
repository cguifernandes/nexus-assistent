"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { NexoMark } from "@/components/ui";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail corporativo")
    .email("E-mail inválido")
    .refine(
      (e) => e.toLowerCase().endsWith("@nexo.com"),
      "Use seu e-mail @nexo.com",
    ),
  password: z.string().min(1, "Informe sua senha"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: Form) {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await res.json()) as {
      error?: string;
      user?: { role: string };
    };
    if (!res.ok || !data.user)
      return setError("root", {
        message: data.error ?? "Não foi possível entrar",
      });
    router.push(data.user.role === "analyst" ? "/console" : "/chat");
  }

  const input =
    "h-11 w-full rounded-lg border border-line bg-paper pl-10 pr-3 text-[14.5px] text-ink placeholder:text-ink-3 focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20";

  return (
    <main className="flex min-h-dvh">
      {/* Showcase */}
      <section className="hidden w-[55%] max-w-[800px] flex-col justify-between bg-ink px-16 pb-12 pt-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <NexoMark size={24} color="#FFFFFF" />
          <span className="text-[17px] font-bold tracking-tight">
            Nexo Assist
          </span>
        </div>

        <div className="space-y-9">
          <div className="space-y-4">
            <p className="text-[13.5px] font-medium text-white/55">
              Service desk de TI da Nexo
            </p>
            <h1 className="font-display text-[54px] leading-[1.05] tracking-tight">
              Seu problema de TI, resolvido em uma conversa.
            </h1>
            <p className="max-w-xl text-base text-white/65">
              Descreva o que está acontecendo. O assistente consulta seus
              chamados, busca na central de ajuda e chama um analista quando
              precisa.
            </p>
          </div>

          <div className="ml-24 w-[500px] max-w-full space-y-2.5 rounded-2xl border border-white/8 bg-white/4 p-[18px]">
            <div className="flex justify-end">
              <div className="rounded-[12px_12px_4px_12px] bg-paper px-3.5 py-2 text-[13.5px] text-ink">
                Meu notebook não conecta na VPN. Erro 809.
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[12.5px]">
                <span className="font-semibold text-white/80">Nexo Assist</span>
                <span className="text-white/45">
                  consultou seus chamados · criou um chamado
                </span>
              </div>
              <div className="max-w-[380px] rounded-[4px_12px_12px_12px] bg-white/8 px-3.5 py-2.5 text-[13.5px]">
                Pronto: abri o chamado com prioridade alta. Um analista fala com
                você em até 4 h úteis.
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-paper px-3 py-[7px] text-[12.5px]">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                <span className="font-semibold text-ink">INC-20517</span>
                <span className="text-ink-3">
                  Rede e VPN · Alta · em até 4 h
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-t border-white/10 pt-6">
          <Stat value="8 s" label="primeira resposta, em média" />
          <Stat value="72%" label="resolvidos sem fila" border />
          <Stat value="6" label="analistas online agora" border live />
        </div>
      </section>

      {/* Sign in */}
      <section className="flex flex-1 flex-col px-8 py-10 lg:px-14">
        <div className="flex items-center justify-end gap-1.5 text-[13.5px]">
          <span className="text-ink-3">Problema para entrar?</span>
          <a href="tel:4000" className="font-semibold text-primary-text">
            Ligue no ramal 4000
          </a>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <form
            onSubmit={handleSubmit(submit)}
            noValidate
            className="w-[380px] max-w-full space-y-7"
          >
            <div className="flex items-center gap-2.5 lg:hidden">
              <NexoMark size={22} />
              <span className="text-base font-bold">Nexo Assist</span>
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-[40px] leading-none">Entrar</h2>
              <p className="text-[15.5px] text-ink-3">
                Use seu e-mail corporativo e a senha da rede Nexo.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[13.5px] font-medium">
                  E-mail corporativo
                </span>
                <span className="relative block">
                  <Icon
                    name="mail"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
                  />
                  <input
                    type="email"
                    placeholder="E-mail"
                    aria-invalid={!!errors.email}
                    className={`${input} ${errors.email ? "border-danger" : ""}`}
                    {...register("email")}
                  />
                </span>
                {errors.email && (
                  <span className="text-[12.5px] text-danger-text">
                    {errors.email.message}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-2">
                <span className="flex items-center justify-between text-[13.5px] font-medium">
                  Senha
                  <a href="/perfil" className="text-primary-text">
                    Esqueci minha senha
                  </a>
                </span>
                <span className="relative block">
                  <Icon
                    name="lock"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-text"
                  />
                  <input
                    type={show ? "text" : "password"}
                    placeholder="Sua senha"
                    aria-invalid={!!errors.password}
                    className={`${input} pr-11 ${errors.password ? "border-danger" : ""}`}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 flex h-[30px] w-[30px] -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-desk"
                  >
                    <Icon name={show ? "eye-off" : "eye"} />
                  </button>
                </span>
                {errors.password && (
                  <span className="text-[12.5px] text-danger-text">
                    {errors.password.message}
                  </span>
                )}
              </label>
              <label className="flex items-center gap-2.5 pt-0.5 text-[13.5px] text-ink-2">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-[18px] w-[18px] rounded-md accent-cta"
                />
                Manter conectado neste computador
              </label>
            </div>

            {errors.root && (
              <p className="text-[13.5px] text-danger-text" role="alert">
                {errors.root.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cta text-[15.5px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,.12),0_6px_16px_-6px_rgba(0,98,196,.5)] hover:bg-cta-hover disabled:opacity-60"
            >
              {isSubmitting ? "Entrando…" : "Entrar"}
              {!isSubmitting && <Icon name="arrow" />}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between text-[12.5px] text-ink-3">
          <span>© 2026 Nexo · Service desk de TI</span>
          <span>Privacidade e uso de dados</span>
        </div>
      </section>
    </main>
  );
}

function Stat({
  value,
  label,
  border,
  live,
}: {
  value: string;
  label: string;
  border?: boolean;
  live?: boolean;
}) {
  return (
    <div
      className={`flex-1 space-y-1.5 ${border ? "border-l border-white/10 pl-6" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-display text-[34px] leading-none">{value}</span>
        {live && <span className="h-2 w-2 rounded-full bg-success" />}
      </div>
      <div className="text-[13.5px] text-white/55">{label}</div>
    </div>
  );
}

export function Icon({
  name,
  className = "",
}: {
  name: "mail" | "lock" | "eye" | "eye-off" | "arrow";
  className?: string;
}) {
  const paths: Record<typeof name, React.ReactNode> = {
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    "eye-off": (
      <>
        <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  };
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
