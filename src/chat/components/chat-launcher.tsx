"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MessageCircle, SendHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { sendChatMessage } from "@/chat/actions";
import type { ChatMessage } from "@/chat/types";

const SUGGESTIONS = [
  "¿Cuánto llevo gastado este mes?",
  "¿En qué categoría gasto más?",
  "¿Cuánto debo o me deben?",
  "¿Qué gastos fijos faltan por pagar?",
];

export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  // Guard sincrónico: el estado `isPending` llega tarde ante doble Enter/tap.
  const submittingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending]);

  function send(text: string) {
    const question = text.trim();
    if (!question || submittingRef.current) return;
    submittingRef.current = true;

    const history: ChatMessage[] = [...messages, { role: "user", text: question }];
    setMessages(history);
    setInput("");

    startTransition(async () => {
      try {
        const result = await sendChatMessage(history);
        if (result.error || !result.reply) {
          // Revertir: la pregunta vuelve al input para reintentar.
          setMessages(messages);
          setInput(question);
          toast.error(result.error ?? "No pude responder ahora.");
          return;
        }
        setMessages([...history, { role: "model", text: result.reply }]);
      } catch {
        setMessages(messages);
        setInput(question);
        toast.error("No pude responder ahora. Intenta de nuevo.");
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Abrir asistente con IA"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+144px)] md:bottom-[88px] right-5 z-[60] flex items-center justify-center bg-card border border-border text-primary hover:-translate-y-0.5 active:scale-95 transition-all duration-150"
        style={{ width: 44, height: 44, borderRadius: 15, boxShadow: "var(--shadow-md)" }}
      >
        <MessageCircle size={20} strokeWidth={2.2} />
      </SheetTrigger>

      <SheetContent
        side="right"
        className="z-[70] gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-[15px] font-extrabold">
            <span className="w-8 h-8 rounded-[10px] bg-primary/10 flex items-center justify-center">
              <Sparkles size={15} className="text-primary" />
            </span>
            Asistente
          </SheetTitle>
          <SheetDescription className="text-[12px]">
            Pregúntame por los gastos, cuotas y balances del hogar.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-[11.5px] font-bold text-muted-foreground uppercase">Prueba con</p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={isPending}
                  className="block w-full text-left text-[13px] bg-card border border-border rounded-[12px] px-3 py-2.5 hover:bg-muted transition-colors disabled:opacity-60"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <p
                className={
                  m.role === "user"
                    ? "max-w-[85%] whitespace-pre-wrap text-[13.5px] leading-snug text-white bg-primary rounded-[14px] rounded-br-[4px] px-3 py-2"
                    : "max-w-[85%] whitespace-pre-wrap text-[13.5px] leading-snug text-foreground bg-muted rounded-[14px] rounded-bl-[4px] px-3 py-2"
                }
              >
                {m.text}
              </p>
            </div>
          ))}

          {isPending && (
            <div className="flex justify-start">
              <p className="text-[13px] text-muted-foreground bg-muted rounded-[14px] rounded-bl-[4px] px-3 py-2 animate-pulse">
                Revisando tus datos…
              </p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border px-3 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
        >
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              maxLength={2000}
              className="flex-1 h-10 rounded-[12px] border border-border bg-background px-3 text-[14px] outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isPending || !input.trim()}
              aria-label="Enviar"
              className="h-10 w-10 shrink-0 rounded-[12px] bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <SendHorizontal size={17} />
            </button>
          </div>
          <p className="text-[10.5px] text-muted-foreground mt-2 text-center">
            Generado por IA a partir de tus datos — puede equivocarse. No es asesoría financiera.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
