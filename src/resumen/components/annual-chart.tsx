"use client";

type DataPoint = {
  month: string;
  label: string;
  expenses: number;
  income: number;
};

type Props = {
  data: DataPoint[];
};

export function AnnualChart({ data }: Props) {
  const max = Math.max(...data.flatMap((d) => [d.expenses, d.income]), 1);
  const scale = (v: number) => Math.max(2, Math.round((v / max) * 120));

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-[14px] px-1">
        <div className="flex items-center gap-[6px]">
          <span className="inline-block w-[10px] h-[10px] rounded-[3px]" style={{ background: "#8b46f0" }} />
          <span className="text-[11.5px] font-semibold text-muted-foreground">Gastos</span>
        </div>
        <div className="flex items-center gap-[6px]">
          <span className="inline-block w-[10px] h-[10px] rounded-[3px]" style={{ background: "#cbc6dc" }} />
          <span className="text-[11.5px] font-semibold text-muted-foreground">Ingresos</span>
        </div>
      </div>

      {/* Bars */}
      <div className="flex items-end justify-between gap-[3px]" style={{ height: "150px" }}>
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-[5px] h-full justify-end">
            <div className="flex items-end gap-[2px]" style={{ height: "120px" }}>
              <div
                className="w-[7px] rounded-t-[3px] transition-all duration-500"
                style={{ height: `${scale(d.expenses)}px`, background: "linear-gradient(180deg,#8b46f0,#6d28d9)" }}
              />
              {d.income > 0 && (
                <div
                  className="w-[7px] rounded-t-[3px] transition-all duration-500"
                  style={{ height: `${scale(d.income)}px`, background: "#cbc6dc" }}
                />
              )}
            </div>
            <span className="text-[9px] font-semibold text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
