import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/ErrorBoundary";
import { RatingListSkeleton } from "@/components/LoadingSkeletons";
import { useRetry } from "@/hooks/useRetry";
import { getContextErrorMessage } from "@/lib/errorMessages";
import { apiRequest, queryClient, queryConfig } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Award, ChevronDown, AlertTriangle, X } from "lucide-react";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

interface EmployeeRating {
  id: string;
  full_name: string;
  position?: string;
  rating: number;
}

interface RatingPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface ViolationRule {
  id: string;
  code: string;
  name: string;
  penalty_percent: number;
  is_active: boolean;
  company_id: string;
}

interface Employee {
  id: string;
  full_name: string;
  position?: string;
  company_id: string;
  status: string;
}

interface RatingData {
  employee_id: string;
  rating: number;
}

const getRatingColor = (rating: number): string => {
  if (rating >= 100) {
    return "#34c75e";
  } // зеленый
  if (rating >= 80) {
    return "#f2e94a";
  } // желтый
  if (rating >= 60) {
    return "#fbc02d";
  } // оранжевый
  if (rating >= 40) {
    return "#f57c00";
  } // оранжево-красный
  return "#e53935"; // красный
};

const getRatingPercentage = (rating: number, maxWidth: number = 601): number => {
  return (rating / 100) * maxWidth;
};

export default function Rating() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRating | null>(null);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [violationComment, setViolationComment] = useState<string>("");
  const [isRatingBoostModalOpen, setIsRatingBoostModalOpen] = useState(false);
  const [ratingBoostPercent, setRatingBoostPercent] = useState<string>("5");
  const [ratingBoostComment, setRatingBoostComment] = useState<string>("");
  const { companyId, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: employees, isLoading: employeesLoading, isError: employeesError } = useQuery<Employee[]>({
    queryKey: ["/api/companies", companyId, "employees"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/companies/${companyId}/employees`);
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: periods = [] } = useQuery<RatingPeriod[]>({
    queryKey: ["/api/rating/periods"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/rating/periods");
      return response.json();
    },
  });

  const getPeriodDates = () => {
    if (selectedPeriod === "current") {
      const now = new Date();
      return {
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    } else if (selectedPeriod === "last") {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        periodStart: lastMonth.toISOString().split("T")[0],
        periodEnd: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0],
      };
    } else if (selectedPeriod === "quarter") {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const quarterStartMonth = quarter * 3;
      return {
        periodStart: new Date(now.getFullYear(), quarterStartMonth, 1).toISOString().split("T")[0],
        periodEnd: new Date(now.getFullYear(), quarterStartMonth + 3, 0).toISOString().split("T")[0],
      };
    } else if (selectedPeriod === "year") {
      const now = new Date();
      return {
        periodStart: new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0],
        periodEnd: new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0],
      };
    } else {
      const period = periods.find(p => p.id === selectedPeriod);
      if (period) {
        return {
          periodStart: period.start_date,
          periodEnd: period.end_date,
        };
      }
      const now = new Date();
      return {
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0],
      };
    }
  };

  const { periodStart, periodEnd } = getPeriodDates();

  const { data: ratingData, isLoading: ratingLoading, isError: ratingError } = useQuery<RatingData[]>({
    queryKey: ["/api/companies", companyId, "ratings", periodStart, periodEnd],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/companies/${companyId}/ratings?periodStart=${periodStart}&periodEnd=${periodEnd}`);
      return response.json();
    },
    enabled: !!companyId,
    ...queryConfig.ratings,
  });

  const { data: violationRules = [], isLoading: rulesLoading } = useQuery<ViolationRule[]>({
    queryKey: ["/api/companies", companyId, "violation-rules"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/companies/${companyId}/violation-rules`);
      return response.json();
    },
    enabled: !!companyId,
  });

  const handleAddViolation = (employee: EmployeeRating) => {
    setSelectedEmployee(employee);
    setIsViolationModalOpen(true);
    setSelectedRuleId(null);
    setViolationComment("");
    const hasActiveRules = (violationRules || []).some((r: ViolationRule) => r.is_active);
    if (!hasActiveRules) {
      toast({
        title: "Нет активных правил",
        description: "Сначала добавьте правило в Настройки → Нарушения",
        variant: "destructive",
      });
    }
  };

  const createViolationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee || !companyId || !selectedRuleId) {
        throw new Error("Не выбрано правило");
      }
      const payload = {
        employee_id: selectedEmployee.id,
        company_id: companyId,
        rule_id: selectedRuleId,
        source: "manual",
        reason: violationComment || "",
      } as const;
      const res = await apiRequest("POST", "/api/violations", payload);
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || "Не удалось добавить нарушение");
      }
      return body;
    },
    onSuccess: () => {
      toast({ title: "Нарушение добавлено", description: "Рейтинг будет пересчитан." });
      setIsViolationModalOpen(false);
      setSelectedEmployee(null);
      setSelectedRuleId(null);
      setViolationComment("");
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey)
          && q.queryKey[0] === "/api/companies"
          && q.queryKey[1] === companyId
          && q.queryKey[2] === "ratings",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "exceptions"] });
    },
    onError: async (error: unknown) => {
      const message = error instanceof Error ? error.message : "Не удалось добавить нарушение";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    },
  });

  const adjustRatingMutation = useMutation({
    mutationFn: async ({ employee, delta }: { employee: EmployeeRating; delta: number }) => {
      const body = { delta, periodStart, periodEnd };
      const res = await apiRequest("POST", `/api/rating/employees/${employee.id}/adjust`, body);
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Не удалось повысить рейтинг");
      }
      return payload;
    },
    onSuccess: () => {
      const percent = ratingBoostPercent;
      toast({ title: "Рейтинг повышен", description: `+${percent}% к рейтингу` });
      setIsRatingBoostModalOpen(false);
      setSelectedEmployee(null);
      setRatingBoostPercent("5");
      setRatingBoostComment("");
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey)
          && q.queryKey[0] === "/api/companies"
          && q.queryKey[1] === companyId
          && q.queryKey[2] === "ratings",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "employees"] });
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : "Не удалось повысить рейтинг";
      toast({ title: "Ошибка", description: m, variant: "destructive" });
    },
  });

  const ratingsMap = new Map<string, number>((ratingData || []).map((r: RatingData) => [r.employee_id, Number(r.rating)]));
  const employeesWithRating: EmployeeRating[] = (employees || []).map((emp: Employee) => ({
    id: emp.id,
    full_name: emp.full_name,
    position: emp.position,
    rating: ratingsMap.has(emp.id) ? Math.round(Number(ratingsMap.get(emp.id))) : 100,
  }));

  const filteredEmployees = employeesWithRating.filter((emp: EmployeeRating) =>
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sortedEmployees = [...filteredEmployees].sort((a, b) => b.rating - a.rating);

  const employeesRetry = useRetry(["/api/companies", companyId, "employees"]);
  const ratingsRetry = useRetry(["/api/companies", companyId, "ratings", periodStart, periodEnd]);

  if (authLoading || employeesLoading || ratingLoading) {
    return <RatingListSkeleton />;
  }

  if (employeesError) {
    const errorMsg = getContextErrorMessage("employees", "fetch");
    return (
      <ErrorState
        message={errorMsg.message}
        onRetry={() => employeesRetry.retry()}
      />
    );
  }

  if (ratingError) {
    const errorMsg = getContextErrorMessage("ratings", "fetch");
    return (
      <ErrorState
        message={errorMsg.message}
        onRetry={() => ratingsRetry.retry()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sortedEmployees.map((employee: EmployeeRating) => {
        const ratingColor = getRatingColor(employee.rating);
        const ratingWidth = getRatingPercentage(employee.rating);
        const showDecrease = employee.rating < 100; // Показываем стрелку вниз если рейтинг меньше 100%

        return (
          <div
            key={employee.id}
            className="bg-[#f8f8f8] rounded-[20px] p-4 flex flex-col gap-[30px]"
          >
            <div className="flex gap-[25px] items-center">
              {/* Avatar and Name */}
              <div className="flex gap-2 items-center">
                <div className="size-[50px] rounded-full overflow-hidden bg-[#ff3b30] flex items-center justify-center text-white font-medium">
                  {employee.full_name
                    .split(" ")
                    .map(n => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="text-base font-semibold text-black leading-[1.2]">
                    {employee.full_name}
                  </div>
                  <div className="text-sm text-[#e16546] leading-[1.2]">
                    {employee.position || "Сотрудник"}
                  </div>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="w-[36px] h-[3px] rotate-90 bg-[rgba(96,96,96,0.2)] rounded-[7px]" />

              {/* Rating Progress Bar */}
              <div className="bg-[#c1c1c1] h-[50px] rounded-[10px] relative overflow-hidden flex-1 min-w-0">
                <div
                  className="absolute left-0 top-0 h-[50px] rounded-[10px] flex items-center justify-between px-[10px] py-1"
                  style={{ 
                    backgroundColor: ratingColor, 
                    width: `${Math.min(100, employee.rating)}%`,
                    minWidth: ratingWidth > 0 ? `${ratingWidth}px` : "0px",
                  }}
                >
                  <div className="text-[10px] font-medium text-white leading-[1.2]">
                    Рейтинг
                  </div>
                  <div className="bg-white rounded-[10px] px-[10px] py-[10px] flex gap-1.5 items-center">
                    <div 
                      className="text-[10px] font-medium leading-[1.2]"
                      style={{ color: ratingColor }}
                    >
                      {employee.rating}%
                    </div>
                    {showDecrease && (
                      <ChevronDown className="w-[10px] h-[7px] rotate-180" style={{ color: ratingColor }} />
                    )}
                    <Award className="w-4 h-4" style={{ color: ratingColor }} />
                  </div>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="w-[36px] h-[3px] rotate-90 bg-[rgba(96,96,96,0.2)] rounded-[7px]" />

              {/* Action Buttons */}
              <div className="flex flex-col gap-1.5 h-[50px] justify-center">
                <button
                  onClick={() => handleAddViolation(employee)}
                  className="bg-[rgba(255,59,48,0.1)] px-6 py-1 rounded-[20px] text-[10px] font-medium text-[#ff3b30] leading-normal hover:bg-[rgba(255,59,48,0.2)] transition-colors"
                >
                  Добавить нарушение
                </button>
                <button
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setIsRatingBoostModalOpen(true);
                    setRatingBoostPercent("5");
                    setRatingBoostComment("");
                  }}
                  className="bg-[rgba(52,199,89,0.08)] px-6 py-1 rounded-[9999px] text-[10px] font-medium text-[#34c759] leading-normal hover:bg-[rgba(52,199,89,0.15)] transition-colors"
                >
                  Повысить рейтинг
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {sortedEmployees.length === 0 && (
        <div className="text-center py-12">
          <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Нет данных для отображения</h3>
          <p className="text-muted-foreground">
            Выберите другой период или проверьте настройки рейтинга
          </p>
        </div>
      )}

      {/* Modal для добавления нарушения */}
      {isViolationModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setIsViolationModalOpen(false);
          setSelectedEmployee(null);
          setSelectedRuleId(null);
          setViolationComment("");
        }}>
          <div 
            className="bg-white rounded-[20px] p-5 w-full max-w-md mx-4 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                  Добавить нарушение сотруднику
                </h3>
                <button
                  onClick={() => {
                    setIsViolationModalOpen(false);
                    setSelectedEmployee(null);
                    setSelectedRuleId(null);
                    setViolationComment("");
                  }}
                  className="p-1 hover:bg-neutral-100 rounded transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black leading-[1.2]">
                      Тип нарушения
                    </label>
                    <Select
                      value={selectedRuleId ?? undefined}
                      onValueChange={setSelectedRuleId}
                    >
                      <SelectTrigger className="w-full bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm border-0 h-auto focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0 data-[placeholder]:text-[#959595]">
                        <SelectValue placeholder="Выберите тип нарушения">
                          {selectedRuleId 
                            ? violationRules.find((r: ViolationRule) => r.id === selectedRuleId)?.name + 
                              ` (${violationRules.find((r: ViolationRule) => r.id === selectedRuleId)?.penalty_percent}%)`
                            : null
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-[12px] border border-[#f8f8f8] shadow-lg z-[60]">
                        {violationRules
                          .filter((r: ViolationRule) => r.is_active)
                          .map((rule: ViolationRule) => (
                            <SelectItem key={rule.id} value={rule.id} className="text-sm">
                              {rule.name} ({rule.penalty_percent}%)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black leading-[1.2]">
                      Комментарий
                    </label>
                    <input
                      type="text"
                      placeholder="Описание нарушения (необязательно)"
                      value={violationComment}
                      onChange={(e) => setViolationComment(e.target.value)}
                      className="w-full bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-[#959595] placeholder:text-[#959595] focus:outline-none focus:ring-2 focus:ring-[#e16546] focus:ring-offset-0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsViolationModalOpen(false);
                    setSelectedEmployee(null);
                    setSelectedRuleId(null);
                    setViolationComment("");
                  }}
                  className="bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors"
                >
                  Отменить
                </button>
                <button
                  disabled={!selectedRuleId || createViolationMutation.isPending || !(violationRules || []).some((r: ViolationRule) => r.is_active)}
                  onClick={() => createViolationMutation.mutate()}
                  className="bg-[#e16546] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#d15536] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createViolationMutation.isPending ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal для повышения рейтинга */}
      {isRatingBoostModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setIsRatingBoostModalOpen(false);
          setSelectedEmployee(null);
          setRatingBoostPercent("5");
          setRatingBoostComment("");
        }}>
          <div 
            className="bg-white rounded-[20px] p-5 w-full max-w-md mx-4 shadow-[0px_0px_20px_0px_rgba(144,144,144,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#1a1a1a] leading-[1.2]">
                  Повысить рейтинг сотруднику
                </h3>
                <button
                  onClick={() => {
                    setIsRatingBoostModalOpen(false);
                    setSelectedEmployee(null);
                    setRatingBoostPercent("5");
                    setRatingBoostComment("");
                  }}
                  className="p-1 hover:bg-neutral-100 rounded transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black leading-[1.2]">
                      Укажите %
                    </label>
                    <input
                      type="number"
                      value={ratingBoostPercent}
                      onChange={(e) => setRatingBoostPercent(e.target.value)}
                      min="1"
                      max="100"
                      className="w-[63px] bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#34c759] focus:ring-offset-0"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-black leading-[1.2]">
                      Комментарий
                    </label>
                    <input
                      type="text"
                      placeholder="Описание нарушения (необязательно)"
                      value={ratingBoostComment}
                      onChange={(e) => setRatingBoostComment(e.target.value)}
                      className="w-full bg-[#f8f8f8] px-[14px] py-3 rounded-[12px] text-sm text-[#959595] placeholder:text-[#959595] focus:outline-none focus:ring-2 focus:ring-[#34c759] focus:ring-offset-0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsRatingBoostModalOpen(false);
                    setSelectedEmployee(null);
                    setRatingBoostPercent("5");
                    setRatingBoostComment("");
                  }}
                  className="bg-[#f8f8f8] px-[17px] py-3 rounded-[40px] text-sm text-black leading-[1.2] hover:bg-[#eeeeee] transition-colors"
                >
                  Отменить
                </button>
                <button
                  disabled={!ratingBoostPercent || adjustRatingMutation.isPending || Number(ratingBoostPercent) <= 0}
                  onClick={() => {
                    const delta = Number(ratingBoostPercent);
                    if (delta > 0 && selectedEmployee) {
                      adjustRatingMutation.mutate({ employee: selectedEmployee, delta });
                    }
                  }}
                  className="bg-[#34c759] px-[17px] py-3 rounded-[40px] text-sm font-medium text-white leading-[1.2] hover:bg-[#2db548] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adjustRatingMutation.isPending ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
