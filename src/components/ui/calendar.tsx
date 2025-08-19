import React, { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = ptBR,
  ...props
}: CalendarProps) {
  useEffect(() => {
    // Força todos os td do calendário a serem table-cell
    const interval = setInterval(() => {
      document.querySelectorAll('.rdp-table td').forEach(td => {
        (td as HTMLElement).style.display = 'table-cell';
      });
    }, 100);
    // Limpa o intervalo ao desmontar
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="w-[320px] mx-auto">
      <DayPicker
        locale={locale}
        showOutsideDays={showOutsideDays}
        className={cn("p-3 pointer-events-auto", className)}
        classNames={{
          months: "flex flex-col items-center justify-center space-y-4 mx-auto",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "border-collapse table-fixed w-full mx-auto",
          head_row: "table-row",
          head_cell:
            "table-cell w-10 h-10 p-0 text-center align-middle font-normal text-[0.8rem] text-muted-foreground border-0 m-0",
          row: "table-row w-full",
          cell: "table-cell w-10 h-10 p-0 text-center align-middle text-sm relative border-0 m-0",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          Day: (props) => (
            <td
              {...props}
              style={{
                display: 'table-cell',
                textAlign: 'center',
                verticalAlign: 'middle',
                width: 40,
                height: 40,
                padding: 0,
                margin: 0,
                boxSizing: 'border-box',
              }}
            >
              {props.children}
            </td>
          ),
          Chevron: ({ orientation, ...props }) => {
            const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
            return <Icon className="h-4 w-4" {...props} />;
          },
        }}
        weekStartsOn={0}
        formatters={{
          formatWeekdayName: (day) => {
            const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            return weekdays[day.getDay()];
          }
        }}
        {...props}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
